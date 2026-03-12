import { createVertex } from "@ai-sdk/google-vertex";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  generateText,
  stepCountIs,
  convertToModelMessages,
  type ModelMessage,
} from "ai";

import { getSystemPrompt, isInitialPrompt } from "@/constants/agent-prompts";
import type { ThemeVariables } from "@/lib/screen-utils";
import { createTools, type FrameState } from "@/lib/agent/tools";
import { runPlanningPipeline } from "@/lib/agent/planner";

export const maxDuration = 120;

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

        // Emit start immediately so the client creates the assistant message
        // before any planning or tool events arrive.
        writer.write({ type: "start", messageId });
        writer.write({ type: "start-step" });

        // 1. Planning pipeline (if initial request) — emits data events into the already-started message
        let planContext = "";
        if (isInitialPrompt(frames, theme) && userPrompt.trim()) {
          planContext = await runPlanningPipeline(userPrompt, vertex, writer);
        }

        // 2. Create tools with mutable context and writer for streaming step events
        const tools = createTools({ frames, theme, writer });

        // 3. Build system prompt
        const system = getSystemPrompt(frames, theme, planContext);

        // 4. Prepare messages
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

        // 5. Strip base64 images from history to avoid Gemini payload limits
        const sanitizedMessages = stripBase64FromMessages(messagesToSend);

        // 6. Run agentic streamText — forward SDK stream as-is (tool-input-*, tool-call, tool-result, etc.)
        const result = streamText({
          model: vertex("gemini-3-pro-preview"),
          system,
          messages: sanitizedMessages,
          tools,
          stopWhen: stepCountIs(10),
          includeRawChunks: true,
          maxRetries: 3,
          experimental_repairToolCall: async ({
            toolCall,
            inputSchema,
            error,
          }) => {
            const schema = await inputSchema({
              toolName: toolCall.toolName,
            });
            if (!schema) return null;
            const repaired = await generateText({
              model: vertex("gemini-2.0-flash"),
              prompt: [
                `The following tool call arguments are invalid and caused this error: ${error.message}`,
                `Tool: ${toolCall.toolName}`,
                `Arguments: ${toolCall.input}`,
                `Expected JSON schema: ${JSON.stringify(schema)}`,
                `Return ONLY the corrected JSON arguments object, nothing else.`,
              ].join("\n"),
            });
            try {
              JSON.parse(repaired.text);
              return {
                type: "tool-call" as const,
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                input: repaired.text,
              };
            } catch {
              return null;
            }
          },
        });

        // 7. Forward streamText UI stream, skipping 'start' (already emitted above)
        const uiStream = result.toUIMessageStream();
        let skippedFirstStart = false;
        let skippedFirstStep = false;
        const filteredStream = uiStream.pipeThrough(
          new TransformStream({
            transform(chunk, controller) {
              const type = (chunk as { type?: string }).type;
              // Skip the first start & start-step since we already emitted them
              if (type === "start" && !skippedFirstStart) {
                skippedFirstStart = true;
                return;
              }
              if (type === "start-step" && !skippedFirstStep) {
                skippedFirstStep = true;
                return;
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
    return Response.json(
      { error: error instanceof Error ? error.message : "Chat API error" },
      { status: 500 },
    );
  }
}
