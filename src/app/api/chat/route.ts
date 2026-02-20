import { createVertex } from "@ai-sdk/google-vertex";
import {
  streamText,
  convertToModelMessages,
  tool,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
} from "ai";
import { z } from "zod";
import { getSystemPrompt } from "@/constants/agent-prompts";
import { wrapScreenBody, extractBodyContent } from "@/lib/screen-utils";
import type { ThemeVariables } from "@/lib/screen-utils";

export const maxDuration = 30;

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

function hasParts(msg: {
  parts?: unknown;
  content?: unknown;
}): msg is { role: string; parts: Array<{ type: string }> } {
  return Array.isArray((msg as { parts?: unknown }).parts);
}

interface FrameState {
  id: string;
  label: string;
  left: number;
  top: number;
  html: string;
}

const FRAME_SPACING = 420;

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

    const modelMessages =
      rawMessages.length > 0 && hasParts(rawMessages[0])
        ? await convertToModelMessages(rawMessages)
        : rawMessages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content ?? "",
          }));

    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        writer.write({
          type: "data-agent-status",
          data: {
            status: "received",
            message: "Request received, AI responding…",
          },
          transient: true,
        });

        const sleekTools = {
          step_analyzed_request: tool({
            description:
              "Call this AFTER you have analyzed the user's request. Confirm you understand: app type, features needed, target audience, any style hints. Must be the FIRST workflow step. Call before step_planned_screens.",
            inputSchema: z.object({}),
            execute: async () => ({
              success: true,
              message: "Request analyzed",
            }),
          }),
          step_planned_screens: tool({
            description:
              "Call this AFTER you have planned which screens to create (e.g. Login, Home, Settings). Must be called after step_analyzed_request and before step_planned_visual_identity.",
            inputSchema: z.object({}),
            execute: async () => ({
              success: true,
              message: "Screens planned",
            }),
          }),
          step_planned_visual_identity: tool({
            description:
              "Call this AFTER you have planned the visual identity — colors, mood, typography (e.g. dark blue, minimal, bold headings). Must be called after step_planned_screens and before build_theme.",
            inputSchema: z.object({}),
            execute: async () => ({
              success: true,
              message: "Visual identity planned",
            }),
          }),
          read_screen: tool({
            description:
              "Returns the current HTML of a screen. Call this before editing. id must be from the Current Screens table in the system context.",
            inputSchema: z.object({ id: z.string() }),
            execute: async ({ id }: { id: string }) => {
              const frame = frames.find((f) => f.id === id);
              const html = frame?.html ? extractBodyContent(frame.html) : "";
              return html || "(empty screen)";
            },
          }),
          read_theme: tool({
            description: "Returns current CSS theme variables and fonts.",
            inputSchema: z.object({}),
            execute: async () => JSON.stringify(theme, null, 2),
          }),
          create_screen: tool({
            description:
              "Creates a new screen. screen_html is inner body content only (no html, head, or body tags).",
            inputSchema: z.object({
              name: z.string().describe("Screen label/name"),
              screen_html: z.string().describe("HTML for body content only"),
            }),
            execute: async ({
              name,
              screen_html,
            }: {
              name: string;
              screen_html: string;
            }) => {
              const lastFrame = frames[frames.length - 1];
              const left = lastFrame ? lastFrame.left + FRAME_SPACING : 0;
              const top = lastFrame ? lastFrame.top : 0;
              const id = String(Date.now());
              const html = wrapScreenBody(screen_html, theme);
              frames.push({ id, label: name, left, top, html });

              writer.write({
                type: "data-frame-action",
                data: {
                  action: "add",
                  payload: { id, label: name, left, top, html },
                },
                transient: true,
              });

              return { success: true, message: `Created screen "${name}"` };
            },
          }),
          update_screen: tool({
            description:
              "Replaces the ENTIRE screen body. Use only for broad layout redesigns. Do NOT use for small targeted edits.",
            inputSchema: z.object({
              id: z.string().describe("Frame id"),
              screen_html: z.string().describe("HTML for body content only"),
            }),
            execute: async ({
              id,
              screen_html,
            }: {
              id: string;
              screen_html: string;
            }) => {
              const frame = frames.find((f) => f.id === id);
              if (frame) {
                frame.html = wrapScreenBody(screen_html, theme);
                writer.write({
                  type: "data-frame-action",
                  data: {
                    action: "updateHtml",
                    payload: { id, html: frame.html },
                  },
                  transient: true,
                });
              }
              return { success: true };
            },
          }),
          edit_screen: tool({
            description:
              "Targeted find/replace on screen HTML. Use for specific-section edits (e.g., change one button color). Preserves the rest of the UI. find must match read_screen output exactly. One edit per screen.",
            inputSchema: z.object({
              id: z.string(),
              find: z
                .string()
                .describe("Exact string to find (from read_screen)"),
              replace: z.string().describe("Replacement string"),
            }),
            execute: async ({
              id,
              find,
              replace,
            }: {
              id: string;
              find: string;
              replace: string;
            }) => {
              const frame = frames.find((f) => f.id === id);
              if (!frame?.html) {
                return { success: false, error: "Screen not found" };
              }
              if (!frame.html.includes(find)) {
                return {
                  success: false,
                  error:
                    "Find string not found - ensure exact match from read_screen",
                };
              }
              const newHtml = frame.html.replace(find, replace);
              frame.html = newHtml;
              writer.write({
                type: "data-frame-action",
                data: { action: "updateHtml", payload: { id, html: newHtml } },
                transient: true,
              });
              return { success: true };
            },
          }),
          update_theme: tool({
            description:
              "Updates CSS theme variables. Example: { '--primary': '#2563EB' }",
            inputSchema: z.object({
              updates: z
                .record(z.string(), z.string())
                .describe("CSS variable names to values"),
            }),
            execute: async ({
              updates,
            }: {
              updates: Record<string, string>;
            }) => {
              for (const k of Object.keys(updates)) {
                const v = updates[k];
                if (v !== undefined) theme[k] = v;
              }
              writer.write({
                type: "data-frame-action",
                data: { action: "setTheme", payload: { updates } },
                transient: true,
              });
              return { success: true };
            },
          }),
          build_theme: tool({
            description:
              "Builds the global theme from user description. Replaces the entire theme. Use when the user describes a theme (e.g. 'dark blue', 'minimal light', 'forest green'). Provide a complete theme with all required vars: --background, --foreground, --primary, --primary-foreground, --secondary, --secondary-foreground, --muted, --muted-foreground, --card, --card-foreground, --border, --input, --ring, --radius, --font-sans, --font-heading. No defaults - theme is built purely from the user prompt.",
            inputSchema: z.object({
              description: z
                .string()
                .describe("User's theme description/prompt"),
              theme_vars: z
                .record(z.string(), z.string())
                .describe(
                  "Complete theme as CSS variables. Keys like --primary, --background, etc.",
                ),
            }),
            execute: async ({
              theme_vars,
            }: {
              description: string;
              theme_vars: Record<string, string>;
            }) => {
              for (const k of Object.keys(theme)) delete theme[k];
              for (const [k, v] of Object.entries(theme_vars)) {
                theme[k] = v;
              }
              writer.write({
                type: "data-frame-action",
                data: {
                  action: "replaceTheme",
                  payload: { theme: { ...theme } },
                },
                transient: true,
              });
              return {
                success: true,
                message: "Theme built from user prompt",
              };
            },
          }),
        };

        const result = streamText({
          model: vertex("gemini-3-pro-preview"),
          system: getSystemPrompt(frames, theme),
          messages: modelMessages,
          tools: sleekTools,
          stopWhen: stepCountIs(10),
          providerOptions: {
            vertex: {
              thinkingConfig: {
                includeThoughts: true,
              },
            },
          },
        });

        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Chat API error" },
      { status: 500 },
    );
  }
}
