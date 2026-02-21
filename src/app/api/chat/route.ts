import { createVertex } from "@ai-sdk/google-vertex";
import {
  streamText,
  generateObject,
  generateImage,
  convertToModelMessages,
  tool,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  type ModelMessage,
} from "ai";
import { z } from "zod";
import { getSystemPrompt } from "@/constants/agent-prompts";
import {
  wrapScreenBody,
  extractBodyContent,
  normalizeThemeVars,
} from "@/lib/screen-utils";
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

const PLANNER_CLASSIFY_PROMPT = `Given a user request for a mobile app, determine if they want to "generate" (create new screens) or "edit" (modify existing). Reply with intent only.`;

const PLANNER_SCREENS_PROMPT = `Given a user request and that intent is "generate", list the screens to create. Each screen has name and description.`;

const PLANNER_STYLE_PROMPT = `Given a user request and the screens to create, provide visual guidelines (colors, mood, typography) and whether to generate (true for new designs).`;

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

    const isInitial = frames.length === 0 || Object.keys(theme).length === 0;
    const imageMap: Record<string, string> = {};

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({
          type: "data-agent-status",
          data: {
            status: "received",
            message: "Request received, AI responding…",
          },
          transient: true,
        });

        let planContext = "";
        if (isInitial && userPrompt.trim()) {
          try {
            // Step 1: classifyIntent
            const classify = await generateObject({
              model: vertex("gemini-2.0-flash"),
              schema: z.object({ intent: z.enum(["generate", "edit"]) }),
              prompt: `${PLANNER_CLASSIFY_PROMPT}\n\nUser request:\n${userPrompt}`,
            });
            const intent = classify.object.intent;
            writer.write({
              type: "data-step-result",
              id: "classifyIntent",
              data: {
                result: { intent },
                status: "success",
                stepId: "classifyIntent",
              },
            });

            // Step 2: planScreens (only when generating)
            let screens: Array<{ name: string; description: string }> = [];
            if (intent === "generate") {
              const screensPlan = await generateObject({
                model: vertex("gemini-2.0-flash"),
                schema: z.object({
                  screens: z.array(
                    z.object({
                      name: z.string(),
                      description: z.string(),
                    }),
                  ),
                }),
                prompt: `${PLANNER_SCREENS_PROMPT}\n\nUser request:\n${userPrompt}`,
              });
              screens = screensPlan.object.screens;
            }
            writer.write({
              type: "data-step-result",
              id: "planScreens",
              data: {
                result: { screens },
                status: "success",
                stepId: "planScreens",
              },
            });

            // Step 3: planStyle
            const stylePlan = await generateObject({
              model: vertex("gemini-2.0-flash"),
              schema: z.object({
                guidelines: z.string(),
                shouldGenerate: z.boolean(),
              }),
              prompt: `${PLANNER_STYLE_PROMPT}\n\nUser request:\n${userPrompt}\n\nScreens: ${JSON.stringify(screens)}\n\nOutput visual guidelines and whether to generate (true for new designs).`,
            });
            const { guidelines, shouldGenerate } = stylePlan.object;
            writer.write({
              type: "data-step-result",
              id: "planStyle",
              data: {
                result: { guidelines, shouldGenerate },
                status: "success",
                stepId: "planStyle",
              },
            });

            writer.write({
              type: "data-step-start",
              data: {},
            });
            planContext = `## Planning (from pipeline)\n- Intent: ${intent}\n- Screens to create: ${JSON.stringify(screens, null, 2)}\n- Visual guidelines: ${guidelines}\n`;
          } catch {
            // Planner failed, continuing without plan
          }
        }

        const sleekTools = {
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
              'Creates a new screen. screen_html is inner body content only (no html, head, or body tags). Use src="placeholder:{id}" for AI-generated images; call generate_image first with the same id.',
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
              let html = screen_html;
              for (const [id, url] of Object.entries(imageMap)) {
                html = html.replace(new RegExp(`placeholder:${id}`, "g"), url);
              }
              const lastFrame = frames[frames.length - 1];
              const left = lastFrame ? lastFrame.left + FRAME_SPACING : 0;
              const top = lastFrame ? lastFrame.top : 0;
              const frameId = String(Date.now());
              const wrappedHtml = wrapScreenBody(html, theme);
              frames.push({
                id: frameId,
                label: name,
                left,
                top,
                html: wrappedHtml,
              });

              writer.write({
                type: "data-frame-action",
                data: {
                  action: "add",
                  payload: {
                    id: frameId,
                    label: name,
                    left,
                    top,
                    html: wrappedHtml,
                  },
                },
                transient: true,
              });

              return {
                success: true,
                id: frameId,
                message: `Created screen "${name}"`,
              };
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
              let html = screen_html;
              for (const [imgId, url] of Object.entries(imageMap)) {
                html = html.replace(
                  new RegExp(`placeholder:${imgId}`, "g"),
                  url,
                );
              }
              const frame = frames.find((f) => f.id === id);
              if (frame) {
                frame.html = wrapScreenBody(html, theme);
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
          create_theme: tool({
            description:
              'Creates/sets the global theme. Pass theme_json as a JSON object string with CSS variables. Example: {"--primary":"#2563eb","--background":"#0f172a","--foreground":"#f8fafc","--card":"#1e293b","--radius":"0.5rem"}. Keys must include -- prefix. Never abbreviate.',
            inputSchema: z.object({
              theme_json: z
                .string()
                .describe(
                  'JSON string: object with --prefixed keys to color/length values, e.g. {"--primary":"#2563eb","--background":"#fff"}',
                ),
            }),
            execute: async ({ theme_json }: { theme_json: string }) => {
              let themeVars: Record<string, string> = {};
              try {
                const parsed = JSON.parse(theme_json);
                if (parsed && typeof parsed === "object") {
                  for (const [k, v] of Object.entries(parsed)) {
                    if (typeof v === "string") themeVars[k] = v;
                  }
                }
              } catch {
                return { success: false, error: "Invalid theme_json" };
              }
              const normalized = normalizeThemeVars(themeVars);
              for (const k of Object.keys(theme)) delete theme[k];
              for (const [k, v] of Object.entries(normalized)) {
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
              return { success: true };
            },
          }),
          build_theme: tool({
            description:
              "Builds the global theme from user description. Replaces the entire theme. Use when the user describes a theme (e.g. 'dark blue', 'minimal light'). Provide theme_vars with all CSS variables. Prefer create_theme for direct theme object.",
            inputSchema: z.object({
              description: z.string().optional(),
              theme_vars: z.record(z.string(), z.string()),
            }),
            execute: async ({
              theme_vars,
            }: {
              description?: string;
              theme_vars: Record<string, string>;
            }) => {
              const normalized = normalizeThemeVars(theme_vars);
              for (const k of Object.keys(theme)) delete theme[k];
              for (const [k, v] of Object.entries(normalized)) {
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
              return { success: true, message: "Theme built" };
            },
          }),
          generate_image: tool({
            description:
              'Generates an AI image. Call FIRST before create_screen/update_screen that uses it. In HTML use src="placeholder:{id}" to reference. aspect_ratio: square|landscape|portrait. background: opaque (photos) or transparent (icons).',
            inputSchema: z.object({
              id: z.string().describe("Placeholder id, e.g. img-1"),
              prompt: z.string().describe("Detailed image description"),
              aspect_ratio: z.enum(["square", "landscape", "portrait"]),
              background: z.enum(["opaque", "transparent"]),
            }),
            execute: async ({
              id,
              prompt,
              aspect_ratio,
            }: {
              id: string;
              prompt: string;
              aspect_ratio: string;
              background: string;
            }) => {
              if (process.env.IMAGE_GEN_API_URL) {
                try {
                  const res = await fetch(process.env.IMAGE_GEN_API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      prompt,
                      aspect_ratio,
                      n: 1,
                    }),
                  });
                  const data = await res.json();
                  const url =
                    data.url ?? data.data?.[0]?.url ?? data.output?.[0];
                  if (url) {
                    imageMap[id] = url;
                    return { success: true, url };
                  }
                } catch {
                  // Image gen failed
                }
              }
              if (
                process.env.GOOGLE_CLIENT_EMAIL &&
                process.env.GOOGLE_PRIVATE_KEY
              ) {
                try {
                  const aspectRatioMap = {
                    square: "1:1" as const,
                    landscape: "16:9" as const,
                    portrait: "9:16" as const,
                  };
                  const aspectRatio =
                    aspectRatioMap[
                      aspect_ratio as keyof typeof aspectRatioMap
                    ] ?? "1:1";
                  const imageModel = vertex.image(
                    "imagen-3.0-fast-generate-001",
                  );
                  const { image } = await generateImage({
                    model: imageModel,
                    prompt,
                    n: 1,
                    aspectRatio,
                  });
                  const dataUrl = `data:${image.mediaType};base64,${image.base64}`;
                  imageMap[id] = dataUrl;
                  return { success: true, url: dataUrl };
                } catch {
                  // Vertex image gen failed
                }
              }
              const w =
                aspect_ratio === "landscape"
                  ? 1024
                  : aspect_ratio === "portrait"
                    ? 768
                    : 512;
              const h =
                aspect_ratio === "landscape"
                  ? 768
                  : aspect_ratio === "portrait"
                    ? 1024
                    : 512;
              imageMap[id] = `https://picsum.photos/seed/${id}/${w}/${h}`;
              return { success: true, url: imageMap[id] };
            },
          }),
        };

        const modelMessages =
          rawMessages.length > 0 && rawMessages.some(hasParts)
            ? await convertToModelMessages(rawMessages, {
                tools: sleekTools,
              })
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
        const hasContent = validMessages.length > 0;
        const messagesToSend =
          !hasContent || validMessages.length === 0
            ? [
                ...validMessages,
                {
                  role: "user" as const,
                  content: userPrompt?.trim() || "Hello",
                },
              ]
            : validMessages;

        const result = streamText({
          model: vertex("gemini-3-pro-preview"),
          system: getSystemPrompt(frames, theme, planContext),
          messages: messagesToSend,
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
    return Response.json(
      { error: error instanceof Error ? error.message : "Chat API error" },
      { status: 500 },
    );
  }
}
