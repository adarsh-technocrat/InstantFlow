import { createVertex } from "@ai-sdk/google-vertex";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  stepCountIs,
  convertToModelMessages,
  type ModelMessage,
} from "ai";

import {
  getSystemPrompt,
  isInitialPrompt,
  buildAgentScope,
} from "@/constants/agent-prompts";
import type { ThemeVariables } from "@/lib/screen-utils";
import { createTools, type FrameState } from "@/lib/agent/tools";
import { runPlanningPipeline } from "@/lib/agent/planner";

export const runtime = "nodejs";

const CHAT_MODEL_ID = process.env.CHAT_MODEL_ID ?? "gemini-2.5-pro";
const DESIGN_MODEL_ID = process.env.DESIGN_MODEL_ID ?? "gemini-3-pro-preview";

const vertex = createVertex({
  ...(process.env.GOOGLE_CLIENT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY && {
      googleAuthOptions: {
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        },
      },
    }),
});

function getProviderOptions(modelId: string) {
  const id = modelId.toLowerCase();
  if (id.includes("gemini")) {
    return {
      google: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingBudget: 8192,
        },
      },
    };
  }
  return {};
}

function hasParts(
  msg: object | null | undefined,
): msg is { role: string; parts: Array<{ type: string }> } {
  return Array.isArray(
    (msg as { parts?: Array<{ type: string }> } | null)?.parts,
  );
}

function stripBase64FromMessages(messages: ModelMessage[]): ModelMessage[] {
  const BASE64_RE = /data:image\/[^;]+;base64,[A-Za-z0-9+/=]{100,}/g;
  const serialized = JSON.stringify(messages);
  if (!BASE64_RE.test(serialized)) return messages;
  return JSON.parse(
    serialized.replace(BASE64_RE, "(base64 image data omitted)"),
  ) as ModelMessage[];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    const initialFrames = Array.isArray(body?.frames) ? body.frames : [];
    const initialTheme = (body?.theme ?? {}) as ThemeVariables;

    const agentId = body?.agentId as string | undefined;
    const agentName = body?.agentName as string | undefined;
    const subTask = body?.subTask as string | undefined;
    const assignedScreens = (body?.assignedScreens ?? []) as string[];
    const screenPositions = (body?.screenPositions ?? []) as Array<{
      left: number;
      top: number;
    }>;
    const assignedFrameIds = (body?.assignedFrameIds ?? []) as string[];
    const isFirstAgent = body?.isFirstAgent as boolean | undefined;
    const agentPlanContext = body?.planContext as string | undefined;
    const agentCount = typeof body?.agentCount === "number" ? body.agentCount : 1;

    const lastMsg = rawMessages[rawMessages.length - 1];
    const userPrompt =
      typeof lastMsg?.content === "string"
        ? lastMsg.content
        : ((lastMsg?.parts?.[0] as { text?: string })?.text ?? "");

    const frames: FrameState[] = initialFrames.map((f: FrameState) => ({
      id: f.id,
      label: f.label,
      left: f.left ?? 0,
      top: f.top ?? 0,
      html: f.html ?? "",
    }));
    const theme: ThemeVariables = { ...initialTheme };

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const messageId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

        writer.write({ type: "start", messageId });
        writer.write({ type: "start-step" });

        let planContext = "";
        if (agentPlanContext) {
          planContext = agentPlanContext;
        } else if (isInitialPrompt(frames) && userPrompt.trim()) {
          const planning = await runPlanningPipeline(
            userPrompt,
            vertex,
            writer,
            theme,
          );
          planContext = planning.planContext;
        }

        const tools = createTools({
          frames,
          theme,
          writer,
          designModel: { vertex, modelId: DESIGN_MODEL_ID },
          screenPositions: screenPositions.length > 0 ? screenPositions : undefined,
          allowSpawnAgents: !agentId,
          excludeCreateScreen: !!agentId,
        });

        let agentScope = "";
        if (agentId && agentName && subTask) {
          agentScope = buildAgentScope({
            name: agentName,
            subTask,
            assignedScreens,
            assignedFrameIds,
            screenPositions,
            isFirstAgent: isFirstAgent ?? false,
          });
        }
        const system = getSystemPrompt(frames, theme, planContext, agentScope, agentCount);

        const modelMessages =
          rawMessages.length > 0 && rawMessages.some(hasParts)
            ? await convertToModelMessages(rawMessages, { tools })
            : rawMessages.map(
                (m: {
                  role: string;
                  content?: string;
                  parts?: Array<{ type: string; text?: string }>;
                }) => ({
                  role: m.role,
                  content:
                    m.content ??
                    (Array.isArray(m.parts)
                      ? m.parts
                          .filter(
                            (p): p is { type: string; text: string } =>
                              p.type === "text" && p.text != null,
                          )
                          .map((p) => p.text)
                          .join("")
                      : ""),
                }),
              );

        const validMessages = modelMessages.filter(
          (m: ModelMessage) =>
            (typeof m.content === "string" && m.content.length > 0) ||
            (Array.isArray(m.content) && m.content.length > 0),
        );
        const messagesToSend: ModelMessage[] =
          validMessages.length === 0
            ? [
                {
                  role: "user" as const,
                  content: userPrompt?.trim() || "Hello",
                },
              ]
            : validMessages;

        const sanitizedMessages = stripBase64FromMessages(messagesToSend);

        const result = streamText({
          model: vertex(CHAT_MODEL_ID),
          system,
          messages: sanitizedMessages,
          tools,
          stopWhen: stepCountIs(10),
          maxRetries: 2,
          providerOptions: getProviderOptions(CHAT_MODEL_ID) as Parameters<
            typeof streamText
          >[0]["providerOptions"],
        });
        const uiStream = result.toUIMessageStream();
        let skippedFirstStart = false;
        let skippedFirstStep = false;
        let stepCount = 0;
        const seenToolInputStart = new Set<string>();
        const seenToolOutputAvailable = new Set<string>();
        const filteredStream = uiStream.pipeThrough(
          new TransformStream({
            transform(chunk, controller) {
              const c = chunk as { type?: string; toolCallId?: string };
              const type = c.type;
              if (type === "start" && !skippedFirstStart) {
                skippedFirstStart = true;
                return;
              }
              if (type === "start-step") {
                if (!skippedFirstStep) {
                  skippedFirstStep = true;
                  return;
                }
                stepCount++;
              }
              if (
                stepCount > 0 &&
                (type === "reasoning-start" ||
                  type === "reasoning-delta" ||
                  type === "reasoning-end")
              ) {
                return;
              }
              if (type === "tool-input-start" && c.toolCallId) {
                if (seenToolInputStart.has(c.toolCallId)) return;
                seenToolInputStart.add(c.toolCallId);
              }
              if (type === "tool-output-available" && c.toolCallId) {
                if (seenToolOutputAvailable.has(c.toolCallId)) return;
                seenToolOutputAvailable.add(c.toolCallId);
              }
              controller.enqueue(chunk);
            },
          }),
        );
        writer.merge(filteredStream);
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat API error";
    const is429 =
      message.includes("Resource exhausted") ||
      (error &&
        typeof error === "object" &&
        "lastError" in error &&
        (error as { lastError?: { statusCode?: number } }).lastError
          ?.statusCode === 429);
    return Response.json(
      {
        error: is429
          ? "Rate limit exceeded. Please wait a moment and try again."
          : message,
      },
      { status: is429 ? 429 : 500 },
    );
  }
}
