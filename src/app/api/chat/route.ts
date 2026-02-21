import {
  GoogleGenAI,
  FunctionCallingConfigMode,
  type Content,
} from "@google/genai";
import { createVertex } from "@ai-sdk/google-vertex";
import {
  generateObject,
  generateImage,
  convertToModelMessages,
  tool,
  createUIMessageStream,
  createUIMessageStreamResponse,
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
import { GENAI_FUNCTION_DECLARATIONS } from "@/lib/genai-tools";
import { modelMessagesToGenAIContents } from "@/lib/genai-content";

export const maxDuration = 30;

function getGenAI(): GoogleGenAI {
  const apiKey =
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GOOGLE_API_KEY;
  const project = (
    process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GOOGLE_VERTEX_PROJECT
  )?.trim();
  const location =
    process.env.GOOGLE_CLOUD_LOCATION ??
    process.env.GOOGLE_VERTEX_LOCATION ??
    "us-central1";
  const hasVertexCreds =
    process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;

  if (project) {
    return new GoogleGenAI({
      vertexai: true,
      project,
      location,
      ...(hasVertexCreds && {
        googleAuthOptions: {
          credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
            private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
          },
        },
      }),
    });
  }
  if (apiKey) {
    return new GoogleGenAI({ apiKey });
  }
  throw new Error(
    "GenAI auth not configured. Set GOOGLE_CLOUD_PROJECT (and optionally GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY) for Vertex, or GEMINI_API_KEY for Gemini API.",
  );
}

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

const STREAM_THROTTLE_MS = 120;

function mergePartialArgs(
  obj: Record<string, unknown>,
  partialArgs: Array<{
    jsonPath?: string;
    stringValue?: string;
    numberValue?: number;
    boolValue?: boolean;
    nullValue?: unknown;
    willContinue?: boolean;
  }>,
): void {
  for (const pa of partialArgs ?? []) {
    const path = (pa.jsonPath ?? "$").replace(/^\$\.?/, "").split(".");
    if (path.length === 0 || path[0] === "") continue;
    let cur: Record<string, unknown> = obj;
    for (let i = 0; i < path.length - 1; i++) {
      const k = path[i];
      if (!(k in cur) || typeof cur[k] !== "object" || cur[k] === null) {
        cur[k] = {};
      }
      cur = cur[k] as Record<string, unknown>;
    }
    const last = path[path.length - 1];
    if ("stringValue" in pa && pa.stringValue !== undefined) {
      cur[last] = ((cur[last] as string) ?? "") + pa.stringValue;
    } else if ("numberValue" in pa && pa.numberValue !== undefined) {
      cur[last] = pa.numberValue;
    } else if ("boolValue" in pa && pa.boolValue !== undefined) {
      cur[last] = pa.boolValue;
    } else if ("nullValue" in pa) {
      cur[last] = null;
    }
  }
}

function parseUpdateScreenPartial(
  text: string,
): { id?: string; screen_html?: string } | null {
  if (!text || typeof text !== "string") return null;
  try {
    let repaired = text.trim();
    if (!repaired.startsWith("{")) return null;
    if (!repaired.endsWith("}")) {
      if (repaired.endsWith('"')) {
        repaired += "}";
      } else if (/"[^"]*$/.test(repaired) || /:\s*$/.test(repaired)) {
        repaired += '"}';
      } else {
        repaired += "}";
      }
    }
    const parsed = JSON.parse(repaired) as {
      id?: string;
      screen_html?: string;
    };
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function extractPartialScreenHtml(buffer: string): string | null {
  const key = '"screen_html"';
  const idx = buffer.indexOf(key);
  if (idx === -1) return null;
  const valStart = buffer.indexOf('"', idx + key.length);
  if (valStart === -1) return null;
  let i = valStart + 1;
  let out = "";
  while (i < buffer.length) {
    const c = buffer[i];
    if (c === "\\") {
      if (i + 1 >= buffer.length) break;
      const next = buffer[i + 1];
      if (next === '"') {
        out += '"';
        i += 2;
      } else if (next === "\\") {
        out += "\\";
        i += 2;
      } else if (next === "n") {
        out += "\n";
        i += 2;
      } else if (next === "t") {
        out += "\t";
        i += 2;
      } else {
        out += next;
        i += 2;
      }
      continue;
    }
    if (c === '"') break;
    out += c;
    i++;
  }
  return out.length > 0 ? out : null;
}

function parseCreateScreenPartial(
  text: string,
): { name?: string; screen_html?: string } | null {
  if (!text || typeof text !== "string") return null;
  try {
    let repaired = text.trim();
    if (!repaired.startsWith("{")) return null;
    if (!repaired.endsWith("}")) {
      if (repaired.endsWith('"')) {
        repaired += "}";
      } else if (/"[^"]*$/.test(repaired) || /:\s*$/.test(repaired)) {
        repaired += '"}';
      } else {
        repaired += "}";
      }
    }
    const parsed = JSON.parse(repaired) as {
      name?: string;
      screen_html?: string;
    };
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

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

        const createScreenStreamState = new Map<
          string,
          { buffer: string; lastEmit: number; lastHtmlLen: number }
        >();
        const updateScreenStreamState = new Map<
          string,
          { buffer: string; lastEmit: number }
        >();

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
            onInputStart: ({ toolCallId }) => {
              createScreenStreamState.set(toolCallId, {
                buffer: "",
                lastEmit: 0,
                lastHtmlLen: 0,
              });
              const lastFrame = frames[frames.length - 1];
              const left = lastFrame ? lastFrame.left + FRAME_SPACING : 0;
              const top = lastFrame ? lastFrame.top : 0;
              const frameId = toolCallId;
              frames.push({
                id: frameId,
                label: "Loading…",
                left,
                top,
                html: "",
              });
              writer.write({
                type: "data-frame-action",
                data: {
                  action: "add",
                  payload: {
                    id: frameId,
                    label: "Loading…",
                    left,
                    top,
                    html: "",
                  },
                },
                transient: true,
              });
            },
            onInputDelta: ({ toolCallId, inputTextDelta }) => {
              console.log(toolCallId, inputTextDelta);
              const state = createScreenStreamState.get(toolCallId);
              if (!state) return;
              state.buffer += inputTextDelta;
              const now = Date.now();
              if (now - state.lastEmit < STREAM_THROTTLE_MS) return;
              const frame = frames.find((f) => f.id === toolCallId);
              if (!frame) return;
              let changed = false;
              const parsed = parseCreateScreenPartial(state.buffer);
              if (parsed) {
                if (
                  typeof parsed.name === "string" &&
                  parsed.name !== frame.label
                ) {
                  frame.label = parsed.name;
                  changed = true;
                }
                if (
                  typeof parsed.screen_html === "string" &&
                  parsed.screen_html.length > 0
                ) {
                  const wrappedHtml = wrapScreenBody(parsed.screen_html, theme);
                  frame.html = wrappedHtml;
                  state.lastHtmlLen = parsed.screen_html.length;
                  changed = true;
                }
              }
              if (!changed) {
                const partialHtml = extractPartialScreenHtml(state.buffer);
                if (
                  typeof partialHtml === "string" &&
                  partialHtml.length > state.lastHtmlLen
                ) {
                  const wrappedHtml = wrapScreenBody(partialHtml, theme);
                  frame.html = wrappedHtml;
                  state.lastHtmlLen = partialHtml.length;
                  changed = true;
                }
              }
              if (changed) {
                state.lastEmit = now;
                writer.write({
                  type: "data-frame-action",
                  data: {
                    action: "updateFrame",
                    payload: {
                      id: toolCallId,
                      html: frame.html,
                      label: frame.label,
                    },
                  },
                  transient: true,
                });
              }
            },
            execute: async (
              { name, screen_html }: { name: string; screen_html: string },
              { toolCallId },
            ) => {
              let html = screen_html;
              for (const [id, url] of Object.entries(imageMap)) {
                html = html.replace(new RegExp(`placeholder:${id}`, "g"), url);
              }
              const wrappedHtml = wrapScreenBody(html, theme);
              const frame = frames.find((f) => f.id === toolCallId);
              if (frame) {
                frame.label = name;
                frame.html = wrappedHtml;
                writer.write({
                  type: "data-frame-action",
                  data: {
                    action: "updateFrame",
                    payload: {
                      id: toolCallId,
                      html: wrappedHtml,
                      label: name,
                    },
                  },
                  transient: true,
                });
              } else {
                const lastFrame = frames[frames.length - 1];
                const left = lastFrame ? lastFrame.left + FRAME_SPACING : 0;
                const top = lastFrame ? lastFrame.top : 0;
                frames.push({
                  id: toolCallId,
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
                      id: toolCallId,
                      label: name,
                      left,
                      top,
                      html: wrappedHtml,
                    },
                  },
                  transient: true,
                });
              }
              createScreenStreamState.delete(toolCallId);
              return {
                success: true,
                id: toolCallId,
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
            onInputStart: ({ toolCallId }) => {
              updateScreenStreamState.set(toolCallId, {
                buffer: "",
                lastEmit: 0,
              });
            },
            onInputDelta: ({ toolCallId, inputTextDelta }) => {
              console.log(toolCallId, inputTextDelta);
              const state = updateScreenStreamState.get(toolCallId);
              if (!state) return;
              state.buffer += inputTextDelta;
              const now = Date.now();
              if (now - state.lastEmit < STREAM_THROTTLE_MS) return;
              const parsed = parseUpdateScreenPartial(state.buffer);
              if (!parsed?.id || !parsed.screen_html) return;
              const frame = frames.find((f) => f.id === parsed.id);
              if (!frame) return;
              const wrappedHtml = wrapScreenBody(parsed.screen_html, theme);
              frame.html = wrappedHtml;
              state.lastEmit = now;
              writer.write({
                type: "data-frame-action",
                data: {
                  action: "updateHtml",
                  payload: { id: parsed.id, html: wrappedHtml },
                },
                transient: true,
              });
            },
            execute: async (
              {
                id,
                screen_html,
              }: {
                id: string;
                screen_html: string;
              },
              { toolCallId },
            ) => {
              updateScreenStreamState.delete(toolCallId);
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
          build_theme: tool({
            description:
              "Creates or replaces the global theme. Pass theme_vars as an object: CSS variable names (with --) to values. Use for initial theme creation.",
            inputSchema: z.object({
              description: z.string().optional(),
              theme_vars: z.record(z.string(), z.string()),
            }),
            execute: async ({
              theme_vars = {},
            }: {
              description?: string;
              theme_vars?: Record<string, string>;
            }) => {
              if (!theme_vars || typeof theme_vars !== "object") {
                return {
                  success: false,
                  error:
                    'theme_vars is required. Pass an object like {"--primary":"#2563eb","--background":"#0f172a"}',
                };
              }
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
        const messagesToSend: ModelMessage[] =
          !hasContent || validMessages.length === 0
            ? [
                ...validMessages,
                {
                  role: "user" as const,
                  content: userPrompt?.trim() || "Hello",
                },
              ]
            : validMessages;

        const systemPrompt = getSystemPrompt(frames, theme, planContext);
        const genaiContents = modelMessagesToGenAIContents(messagesToSend);
        if (genaiContents.length === 0) {
          genaiContents.push({
            role: "user",
            parts: [{ text: userPrompt?.trim() || "Hello" }],
          });
        }

        const genaiModelId = "gemini-3-pro-preview";
        // Disable streaming of function args — Gemini 3 + thinking was delivering empty args;
        // non-streaming returns complete fc.args in one chunk.
        const genaiConfig = {
          tools: [{ functionDeclarations: GENAI_FUNCTION_DECLARATIONS }],
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingConfigMode.AUTO,
            },
          },
          generationConfig: {
            maxOutputTokens: 32768,
          },
          thinkingConfig: {
            includeThoughts: true,
          },
        };

        const generateId = () => crypto.randomUUID();
        let contents: typeof genaiContents = [...genaiContents];
        const MAX_STEPS = 10;

        writer.write({
          type: "start",
          messageId: generateId(),
        });
        writer.write({ type: "start-step" });

        for (let step = 0; step < MAX_STEPS; step++) {
          const stream = await getGenAI().models.generateContentStream({
            model: "gemini-3-pro-preview",
            contents,
            config: {
              systemInstruction: systemPrompt,
              ...genaiConfig,
            },
          });

          let textBuffer = "";
          let reasoningBuffer = "";
          let reasoningId: string | null = null;
          let textId: string | null = null;
          const textPartId = step === 0 ? "genai-text" : `genai-text-${step}`;
          const functionCalls: Array<{
            name: string;
            args: Record<string, unknown>;
            id?: string;
            thoughtSignature?: string;
          }> = [];
          let streamingCall: {
            toolCallId: string;
            name: string;
            args: Record<string, unknown>;
            thoughtSignature?: string;
          } | null = null;

          for await (const chunk of stream) {
            const parts = chunk.candidates?.[0]?.content?.parts ?? [];
            for (const part of parts) {
              if ("text" in part && part.text) {
                if ("thought" in part && part.thought) {
                  if (!reasoningId) {
                    reasoningId = generateId();
                    writer.write({
                      type: "reasoning-start",
                      id: reasoningId,
                    });
                  }
                  reasoningBuffer += part.text;
                  writer.write({
                    type: "reasoning-delta",
                    id: reasoningId!,
                    delta: part.text,
                  });
                } else {
                  if (!textId) {
                    textId = textPartId;
                    writer.write({ type: "text-start", id: textPartId });
                  }
                  textBuffer += part.text;
                  writer.write({
                    type: "text-delta",
                    id: textPartId,
                    delta: part.text,
                  });
                }
              }
              if ("functionCall" in part && part.functionCall) {
                const fc = part.functionCall as {
                  name?: string;
                  args?: Record<string, unknown>;
                  partialArgs?: Array<{
                    jsonPath?: string;
                    stringValue?: string;
                    numberValue?: number;
                    boolValue?: boolean;
                    nullValue?: unknown;
                    willContinue?: boolean;
                  }>;
                  willContinue?: boolean;
                };
                const thoughtSig = (part as { thoughtSignature?: string })
                  .thoughtSignature;
                const name = fc.name?.trim() || "";
                if (!name || name === "unknown") continue;
                const hasPartial =
                  Array.isArray(fc.partialArgs) && fc.partialArgs.length > 0;
                const isStreaming = hasPartial || fc.willContinue;

                if (isStreaming) {
                  if (!streamingCall) {
                    const toolCallId = generateId();
                    streamingCall = {
                      toolCallId,
                      name,
                      args: {},
                      thoughtSignature: thoughtSig,
                    };
                    writer.write({
                      type: "tool-input-start",
                      toolCallId,
                      toolName: name,
                    });
                    if (name === "create_screen") {
                      createScreenStreamState.set(toolCallId, {
                        buffer: "",
                        lastEmit: 0,
                        lastHtmlLen: 0,
                      });
                      const lastFrame = frames[frames.length - 1];
                      const left = lastFrame
                        ? lastFrame.left + FRAME_SPACING
                        : 0;
                      const top = lastFrame ? lastFrame.top : 0;
                      frames.push({
                        id: toolCallId,
                        label: "Loading…",
                        left,
                        top,
                        html: "",
                      });
                      writer.write({
                        type: "data-frame-action",
                        data: {
                          action: "add",
                          payload: {
                            id: toolCallId,
                            label: "Loading…",
                            left,
                            top,
                            html: "",
                          },
                        },
                        transient: true,
                      });
                    } else if (name === "update_screen") {
                      updateScreenStreamState.set(toolCallId, {
                        buffer: "",
                        lastEmit: 0,
                      });
                    }
                  }
                  if (streamingCall && thoughtSig) {
                    streamingCall.thoughtSignature = thoughtSig;
                  }
                  if (streamingCall && hasPartial) {
                    mergePartialArgs(streamingCall.args, fc.partialArgs!);
                    const argsJson = JSON.stringify(streamingCall.args);
                    writer.write({
                      type: "tool-input-delta",
                      toolCallId: streamingCall.toolCallId,
                      inputTextDelta: argsJson,
                    });
                    if (streamingCall.name === "create_screen") {
                      const state = createScreenStreamState.get(
                        streamingCall.toolCallId,
                      );
                      if (state) {
                        state.buffer = argsJson;
                        const now = Date.now();
                        if (now - state.lastEmit >= STREAM_THROTTLE_MS) {
                          const frame = frames.find(
                            (f) => f.id === streamingCall!.toolCallId,
                          );
                          if (frame) {
                            const parsed = parseCreateScreenPartial(
                              state.buffer,
                            );
                            if (parsed?.name) frame.label = parsed.name;
                            if (
                              typeof parsed?.screen_html === "string" &&
                              parsed.screen_html
                            ) {
                              frame.html = wrapScreenBody(
                                parsed.screen_html,
                                theme,
                              );
                              state.lastHtmlLen = parsed.screen_html.length;
                            } else {
                              const partialHtml = extractPartialScreenHtml(
                                state.buffer,
                              );
                              if (
                                partialHtml &&
                                partialHtml.length > state.lastHtmlLen
                              ) {
                                frame.html = wrapScreenBody(partialHtml, theme);
                                state.lastHtmlLen = partialHtml.length;
                              }
                            }
                            state.lastEmit = now;
                            writer.write({
                              type: "data-frame-action",
                              data: {
                                action: "updateFrame",
                                payload: {
                                  id: streamingCall.toolCallId,
                                  html: frame.html,
                                  label: frame.label,
                                },
                              },
                              transient: true,
                            });
                          }
                        }
                      }
                    } else if (streamingCall.name === "update_screen") {
                      const state = updateScreenStreamState.get(
                        streamingCall.toolCallId,
                      );
                      if (state) {
                        state.buffer = argsJson;
                        const now = Date.now();
                        if (now - state.lastEmit >= STREAM_THROTTLE_MS) {
                          const parsed = parseUpdateScreenPartial(state.buffer);
                          if (parsed?.id && parsed?.screen_html) {
                            const frame = frames.find(
                              (f) => f.id === parsed.id,
                            );
                            if (frame) {
                              frame.html = wrapScreenBody(
                                parsed.screen_html,
                                theme,
                              );
                              state.lastEmit = now;
                              writer.write({
                                type: "data-frame-action",
                                data: {
                                  action: "updateHtml",
                                  payload: { id: parsed.id, html: frame.html },
                                },
                                transient: true,
                              });
                            }
                          }
                        }
                      }
                    }
                  }
                  if (!fc.willContinue && streamingCall) {
                    if (fc.args && Object.keys(fc.args).length > 0) {
                      Object.assign(streamingCall.args, fc.args);
                    }
                    writer.write({
                      type: "tool-input-available",
                      toolCallId: streamingCall.toolCallId,
                      toolName: streamingCall.name,
                      input: streamingCall.args,
                    });
                    functionCalls.push({
                      name: streamingCall.name,
                      args: streamingCall.args,
                      id: streamingCall.toolCallId,
                      thoughtSignature:
                        thoughtSig ?? streamingCall.thoughtSignature,
                    });
                    streamingCall = null;
                  }
                } else {
                  const args = fc.args ?? {};
                  const toolCallId = generateId();
                  functionCalls.push({
                    name,
                    args,
                    id: toolCallId,
                    thoughtSignature: thoughtSig,
                  });
                  writer.write({
                    type: "tool-input-start",
                    toolCallId,
                    toolName: name,
                  });
                  writer.write({
                    type: "tool-input-delta",
                    toolCallId,
                    inputTextDelta: JSON.stringify(args),
                  });
                  writer.write({
                    type: "tool-input-available",
                    toolCallId,
                    toolName: name,
                    input: args,
                  });
                }
              }
            }
          }

          if (streamingCall) {
            writer.write({
              type: "tool-input-available",
              toolCallId: streamingCall.toolCallId,
              toolName: streamingCall.name,
              input: streamingCall.args,
            });
            functionCalls.push({
              name: streamingCall.name,
              args: streamingCall.args,
              id: streamingCall.toolCallId,
              thoughtSignature: streamingCall.thoughtSignature,
            });
          }

          if (reasoningId) {
            writer.write({ type: "reasoning-end", id: reasoningId });
          }
          if (textId) {
            writer.write({ type: "text-end", id: textPartId });
          }

          if (functionCalls.length === 0) {
            writer.write({ type: "finish-step" });
            break;
          }

          const toolResultsToAdd: Content[] = [];
          for (const fc of functionCalls) {
            const t = sleekTools[fc.name as keyof typeof sleekTools];
            if (!t?.execute) continue;
            try {
              const result = await (
                t as unknown as {
                  execute: (
                    a: unknown,
                    o: { toolCallId: string; messages: ModelMessage[] },
                  ) => Promise<unknown>;
                }
              ).execute(fc.args, {
                toolCallId: fc.id!,
                messages: messagesToSend,
              });
              writer.write({
                type: "tool-output-available",
                toolCallId: fc.id!,
                output: result,
              });
              toolResultsToAdd.push({
                role: "user",
                parts: [
                  {
                    functionResponse: {
                      name: fc.name,
                      response: { result },
                    },
                  },
                ],
              });
            } catch (err) {
              writer.write({
                type: "tool-output-error",
                toolCallId: fc.id!,
                errorText: err instanceof Error ? err.message : "Tool error",
              });
              toolResultsToAdd.push({
                role: "user",
                parts: [
                  {
                    functionResponse: {
                      name: fc.name,
                      response: {
                        error:
                          err instanceof Error ? err.message : "Tool error",
                      },
                    },
                  },
                ],
              });
            }
          }

          const executedCalls = functionCalls.filter(
            (fc) => sleekTools[fc.name as keyof typeof sleekTools]?.execute,
          );
          contents = [
            ...contents,
            {
              role: "model",
              parts: executedCalls.map((fc) => {
                const part: {
                  functionCall: { name: string; args: Record<string, unknown> };
                  thoughtSignature: string;
                } = {
                  functionCall: { name: fc.name, args: fc.args },
                  thoughtSignature:
                    fc.thoughtSignature ?? "skip_thought_signature_validator",
                };
                return part;
              }),
            },
            ...toolResultsToAdd,
          ];
          writer.write({ type: "finish-step" });
        }

        writer.write({ type: "finish", finishReason: "stop" });
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
