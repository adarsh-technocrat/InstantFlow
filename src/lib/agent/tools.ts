/**
 * Tool definitions for the Sleek design agent.
 * Factory function creates tools with closures over mutable state.
 * When designModel is set, create_screen, edit_screen, build_theme, and update_theme
 * delegate content generation to that model (e.g. gemini-3-pro-preview).
 */

import { tool, generateText, generateObject, streamText } from "ai";
import type { UIMessageStreamWriter } from "ai";
import type { GoogleVertexProvider } from "@ai-sdk/google-vertex";
import { z } from "zod";
import {
  wrapScreenBody,
  extractBodyContent,
  normalizeThemeVars,
  type ThemeVariables,
} from "@/lib/screen-utils";
import {
  parseCreateScreenPartial,
  type CreateScreenStreamState,
  type UpdateScreenStreamState,
} from "./stream-helpers";

export interface FrameState {
  id: string;
  label: string;
  left: number;
  top: number;
  html: string;
}

export interface ToolContext {
  frames: FrameState[];
  theme: ThemeVariables;
  writer?: UIMessageStreamWriter;
  /** When set, create_screen / edit_screen / build_theme / update_theme use this model for content generation. */
  designModel?: {
    vertex: GoogleVertexProvider;
    modelId: string;
  };
}

function stripHtmlMarkdown(raw: string): string {
  const trimmed = raw.trim();
  return trimmed
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/** Generate inner body HTML using the design model. Returns null on failure. */
async function generateScreenHtmlWithDesignModel(
  vertex: GoogleVertexProvider,
  modelId: string,
  prompt: string,
  options?: { maxOutputTokens?: number },
): Promise<string | null> {
  try {
    const { text } = await generateText({
      model: vertex(modelId),
      prompt,
      maxOutputTokens: options?.maxOutputTokens ?? 16384,
      providerOptions: DESIGN_MODEL_PROVIDER_OPTIONS,
    });
    const out = stripHtmlMarkdown(text);
    return out || null;
  } catch {
    return null;
  }
}

async function streamScreenHtmlWithDesignModel(
  vertex: GoogleVertexProvider,
  modelId: string,
  prompt: string,
  onChunk: (accumulated: string) => void,
  options?: { maxOutputTokens?: number },
): Promise<string | null> {
  try {
    const result = streamText({
      model: vertex(modelId),
      prompt,
      maxOutputTokens: options?.maxOutputTokens ?? 16384,
    });
    let accumulated = "";
    for await (const part of result.textStream) {
      accumulated += part;
      onChunk(accumulated);
    }
    if (accumulated) onChunk(accumulated);
    const out = stripHtmlMarkdown(accumulated);
    return out || null;
  } catch {
    return null;
  }
}

/** Generate theme variables (flat --key -> value) using the design model. */
const THEME_KEYS =
  "--background, --foreground, --primary, --primary-foreground, --secondary, --secondary-foreground, --muted, --muted-foreground, --card, --card-foreground, --border, --radius, --font-sans, --font-heading";

async function generateThemeWithDesignModel(
  vertex: GoogleVertexProvider,
  modelId: string,
  prompt: string,
): Promise<Record<string, string> | null> {
  try {
    const { object } = await generateObject({
      model: vertex(modelId),
      schema: z.record(z.string(), z.string()),
      prompt: `${prompt}\n\nOutput a JSON object with CSS variable keys (e.g. ${THEME_KEYS}). Keys must start with --.`,
      providerOptions: DESIGN_MODEL_PROVIDER_OPTIONS,
    });
    return object && typeof object === "object" ? object : null;
  } catch {
    return null;
  }
}

const FRAME_SPACING = 420;
const STREAM_THROTTLE_MS = 120;

const DESIGN_MODEL_PROVIDER_OPTIONS = {
  google: {
    thinkingConfig: {
      includeThoughts: false,
      thinkingBudget: 0,
    },
  },
} as const;

export function createTools(ctx: ToolContext) {
  const { frames, theme, writer, designModel } = ctx;

  const createScreenStreamState = new Map<string, CreateScreenStreamState>();
  const updateScreenStreamState = new Map<string, UpdateScreenStreamState>();
  const editScreenStreamBuffer = new Map<string, string>();

  return {
    read_screen: tool({
      description:
        "Returns the current HTML of a screen. Call this before editing. id must be from the Current Screens table in the system context.",
      inputSchema: z.object({ id: z.string() }),
      onInputStart: ({ toolCallId }) => {
        writer?.write({
          type: "tool-input-start",
          toolCallId,
          toolName: "read_screen",
        });
      },
      execute: async ({ id }: { id: string }) => {
        const frame = frames.find((f) => f.id === id);
        const html = frame?.html ? extractBodyContent(frame.html) : "";
        const result = html || "(empty screen)";
        return result;
      },
    }),

    read_theme: tool({
      description:
        "Returns current CSS theme variables and fonts. No arguments needed.",
      inputSchema: z.object({}),
      onInputStart: ({ toolCallId }) => {
        writer?.write({
          type: "tool-input-start",
          toolCallId,
          toolName: "read_theme",
        });
      },
      execute: async () => {
        const result = JSON.stringify(theme, null, 2);
        return result;
      },
    }),

    create_screen: tool({
      description:
        "Creates a new screen at an optional canvas position (left, top in pixels). The design model generates the HTML from the screen name and description (e.g. from the plan).",
      inputSchema: z.object({
        name: z.string().describe("Screen label/name"),
        description: z
          .string()
          .describe(
            "Description of the screen content and layout (e.g. from the plan).",
          ),
        left: z
          .number()
          .optional()
          .describe(
            "X position on the canvas in pixels. Use when you know where the frame should be placed.",
          ),
        top: z
          .number()
          .optional()
          .describe(
            "Y position on the canvas in pixels. Use when you know where the frame should be placed.",
          ),
      }),
      onInputStart: ({ toolCallId }) => {
        writer?.write({
          type: "tool-input-start",
          toolCallId,
          toolName: "create_screen",
        });
        createScreenStreamState.set(toolCallId, {
          buffer: "",
          lastEmit: 0,
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
        // Emit so the client adds the frame on canvas immediately; stream will update it live.
        writer?.write({
          type: "data-tool-call-start",
          data: {
            toolCallId,
            toolName: "create_screen",
            frame: {
              id: frameId,
              label: "Loading…",
              left,
              top,
              html: "",
            },
          },
        });
      },
      onInputDelta: ({ toolCallId, inputTextDelta }) => {
        const state = createScreenStreamState.get(toolCallId);
        if (!state) return;
        state.buffer += inputTextDelta;
        const now = Date.now();
        if (now - state.lastEmit < STREAM_THROTTLE_MS) return;
        const frame = frames.find((f) => f.id === toolCallId);
        if (!frame) return;
        const parsed = parseCreateScreenPartial(state.buffer);
        if (parsed?.name && parsed.name !== frame.label) {
          frame.label = parsed.name;
          state.lastEmit = now;
        }
        if (
          parsed?.left !== undefined &&
          parsed?.top !== undefined &&
          (parsed.left !== frame.left || parsed.top !== frame.top)
        ) {
          frame.left = parsed.left;
          frame.top = parsed.top;
          state.lastEmit = now;
          writer?.write({
            type: "data-tool-call-delta",
            data: {
              toolCallId,
              toolName: "create_screen",
              frame: {
                id: toolCallId,
                label: frame.label,
                left: frame.left,
                top: frame.top,
              },
            },
          });
        }
      },
      execute: async (
        {
          name,
          description,
          left: argLeft,
          top: argTop,
        }: {
          name: string;
          description: string;
          left?: number;
          top?: number;
        },
        { toolCallId },
      ) => {
        if (!designModel?.vertex || !designModel?.modelId) {
          return {
            success: false,
            error: "Design model is required for create_screen.",
          };
        }
        const designPrompt = `You are a mobile UI designer. Generate the inner body HTML (no html/head/body tags) for a screen named "${name}".\n\nDescription: ${description}\n\nUse Tailwind classes and iconify-icon where needed. Output only the complete inner body HTML, no markdown or explanation.`;
        const generated = await streamScreenHtmlWithDesignModel(
          designModel.vertex,
          designModel.modelId,
          designPrompt,
          (accumulated) => {
            const wrapped = wrapScreenBody(accumulated, theme);
            writer?.write({
              type: "data-tool-call-delta",
              data: {
                toolCallId,
                toolName: "create_screen",
                frame: {
                  id: toolCallId,
                  label: name,
                  left: frames.find((f) => f.id === toolCallId)?.left ?? 0,
                  top: frames.find((f) => f.id === toolCallId)?.top ?? 0,
                  html: wrapped,
                },
              },
            });
          },
          { maxOutputTokens: 16384 },
        );
        const finalHtml = generated?.trim() ?? "";
        if (!finalHtml) {
          return {
            success: false,
            error: "Design model did not return HTML. Try again.",
          };
        }
        const wrappedHtml = wrapScreenBody(finalHtml, theme);
        const frame = frames.find((f) => f.id === toolCallId);
        if (frame) {
          frame.label = name;
          frame.html = wrappedHtml;
          if (argLeft !== undefined && argTop !== undefined) {
            frame.left = argLeft;
            frame.top = argTop;
          }
        } else {
          const lastFrame = frames[frames.length - 1];
          const left =
            argLeft !== undefined && argTop !== undefined
              ? argLeft
              : lastFrame
                ? lastFrame.left + FRAME_SPACING
                : 0;
          const top =
            argTop !== undefined ? argTop : lastFrame ? lastFrame.top : 0;
          frames.push({
            id: toolCallId,
            label: name,
            left,
            top,
            html: wrappedHtml,
          });
        }
        createScreenStreamState.delete(toolCallId);
        const frameRecord = frames.find((f) => f.id === toolCallId);
        const result = {
          success: true,
          id: toolCallId,
          message: `Created screen "${name}"`,
          frame: frameRecord
            ? {
                id: frameRecord.id,
                label: frameRecord.label,
                left: frameRecord.left,
                top: frameRecord.top,
                html: frameRecord.html,
              }
            : undefined,
        };
        if (result.frame) {
          writer?.write({
            type: "data-tool-call-end",
            data: {
              toolCallId,
              toolName: "create_screen",
              frame: result.frame,
            },
          });
        }
        return result;
      },
    }),

    update_screen: tool({
      description:
        "Replaces the ENTIRE screen body based on a description of the changes. Use only for broad layout redesigns. Do NOT use for small targeted edits (use edit_screen instead). The design model generates the new HTML from the current screen and your description.",
      inputSchema: z.object({
        id: z.string().describe("Frame id"),
        description: z
          .string()
          .describe(
            "Description of how the screen should be updated (layout, sections, style).",
          ),
      }),
      onInputStart: ({ toolCallId }) => {
        writer?.write({
          type: "tool-input-start",
          toolCallId,
          toolName: "update_screen",
        });
        updateScreenStreamState.set(toolCallId, { buffer: "", lastEmit: 0 });
      },
      onInputDelta: () => {},
      execute: async (
        { id, description }: { id: string; description: string },
        { toolCallId },
      ) => {
        updateScreenStreamState.delete(toolCallId);
        const frame = frames.find((f) => f.id === id);
        if (!frame?.html) {
          return { success: false, error: "Screen not found" };
        }
        if (!designModel?.vertex || !designModel?.modelId) {
          return {
            success: false,
            error: "Design model is required for update_screen.",
          };
        }
        const currentBody = extractBodyContent(frame.html);
        const designPrompt = `You are a mobile UI designer. Update this screen's inner body HTML according to the description below. Output the complete updated inner body HTML only, no markdown or explanation.\n\nDescription of changes: ${description}\n\nCurrent inner body HTML:\n${currentBody}`;
        const generated = await streamScreenHtmlWithDesignModel(
          designModel.vertex,
          designModel.modelId,
          designPrompt,
          (accumulated) => {
            const wrapped = wrapScreenBody(accumulated, theme);
            writer?.write({
              type: "data-tool-call-delta",
              data: {
                toolCallId,
                toolName: "update_screen",
                frame: { id: frame.id, html: wrapped },
              },
            });
          },
          { maxOutputTokens: 16384 },
        );
        const finalHtml = generated?.trim() ?? "";
        if (!finalHtml) {
          return {
            success: false,
            error: "Design model did not return HTML. Try again.",
          };
        }
        frame.html = wrapScreenBody(finalHtml, theme);
        const result = {
          success: true,
          frame: { id: frame.id, html: frame.html },
        };
        writer?.write({
          type: "data-tool-call-end",
          data: {
            toolCallId,
            toolName: "update_screen",
            frame: result.frame,
          },
        });
        return result;
      },
    }),

    edit_screen: tool({
      description:
        "Targeted find/replace on screen HTML. Use for specific-section edits (e.g., change one button color). Preserves the rest of the UI. find must match read_screen output exactly. One edit per screen.",
      inputSchema: z.object({
        id: z.string(),
        find: z.string().describe("Exact string to find (from read_screen)"),
        replace: z.string().describe("Replacement string"),
      }),
      onInputStart: ({ toolCallId }) => {
        writer?.write({
          type: "tool-input-start",
          toolCallId,
          toolName: "edit_screen",
        });
        editScreenStreamBuffer.set(toolCallId, "");
      },
      onInputDelta: ({ toolCallId, inputTextDelta }) => {
        const prev = editScreenStreamBuffer.get(toolCallId) ?? "";
        const buffer = prev + inputTextDelta;
        editScreenStreamBuffer.set(toolCallId, buffer);
        process.stdout.write(inputTextDelta);
      },
      execute: async (
        {
          id,
          find,
          replace,
        }: {
          id: string;
          find: string;
          replace: string;
        },
        { toolCallId },
      ) => {
        editScreenStreamBuffer.delete(toolCallId);
        process.stdout.write("\n"); // end the screen-delta stream line in console
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
        let newHtml: string;
        if (designModel?.vertex && designModel?.modelId) {
          const currentBody = extractBodyContent(frame.html);
          const designPrompt = `You must perform exactly one replacement in the HTML below. Find the exact substring given under "Find" and replace it with the text under "Replace". Do not change any other part of the HTML. Do not add or remove sections. Output the complete inner body HTML with only that one replacement applied.\n\nFind (exact string to replace):\n${find}\n\nReplace with:\n${replace}\n\nCurrent inner body HTML:\n${currentBody}`;
          const generated = await generateScreenHtmlWithDesignModel(
            designModel.vertex,
            designModel.modelId,
            designPrompt,
            { maxOutputTokens: 16384 },
          );
          newHtml = generated
            ? wrapScreenBody(generated, theme)
            : frame.html.replace(find, replace);
        } else {
          newHtml = frame.html.replace(find, replace);
        }
        frame.html = newHtml;
        const result = {
          success: true,
          frame: { id: frame.id, html: frame.html },
        };
        writer?.write({
          type: "data-tool-call-end",
          data: {
            toolCallId,
            toolName: "edit_screen",
            frame: result.frame,
          },
        });
        return result;
      },
    }),

    update_theme: tool({
      description:
        "Updates CSS theme variables. Example: { '--primary': '#2563EB' }",
      inputSchema: z.object({
        updates: z
          .record(z.string(), z.string())
          .describe(
            'Object: CSS variable name -> value, e.g. {"--primary":"#2563eb"}',
          ),
      }),
      onInputStart: ({ toolCallId }) => {
        writer?.write({
          type: "tool-input-start",
          toolCallId,
          toolName: "update_theme",
        });
      },
      execute: async (
        { updates }: { updates: Record<string, string> },
        { toolCallId },
      ) => {
        let toApply = updates;
        if (
          designModel?.vertex &&
          designModel?.modelId &&
          Object.keys(updates).length > 0
        ) {
          const designPrompt = `Given current theme and requested updates, output a full coherent CSS theme as a flat object. Required keys: ${THEME_KEYS}. Current theme: ${JSON.stringify(theme)}. Requested updates: ${JSON.stringify(updates)}. Return the complete merged theme.`;
          const generated = await generateThemeWithDesignModel(
            designModel.vertex,
            designModel.modelId,
            designPrompt,
          );
          if (generated) {
            const normalized = normalizeThemeVars(generated);
            for (const k of Object.keys(theme)) delete theme[k];
            for (const [k, v] of Object.entries(normalized)) theme[k] = v;
            toApply = normalized;
          } else {
            for (const k of Object.keys(updates)) {
              const v = updates[k];
              if (v !== undefined) theme[k] = String(v);
            }
          }
        } else {
          for (const k of Object.keys(updates)) {
            const v = updates[k];
            if (v !== undefined) theme[k] = String(v);
          }
        }
        const result = { success: true, themeUpdates: { ...toApply } };
        writer?.write({
          type: "data-tool-call-end",
          data: {
            toolCallId,
            toolName: "update_theme",
            themeUpdates: result.themeUpdates,
          },
        });
        return result;
      },
    }),

    build_theme: tool({
      description:
        'Creates or replaces the global theme. Pass CSS variables as a flat object, e.g. {"--primary":"#2563eb","--background":"#0f172a"}. Use for initial theme creation.',
      inputSchema: z.object({
        description: z.string().optional(),
        variables: z
          .record(z.string(), z.string())
          .describe(
            'Flat object mapping CSS variable names to values. Example: {"--primary":"#2563eb","--background":"#0f172a","--radius":"0.5rem"}',
          ),
      }),
      onInputStart: ({ toolCallId }) => {
        writer?.write({
          type: "tool-input-start",
          toolCallId,
          toolName: "build_theme",
        });
      },
      execute: async (
        {
          description,
          variables = {},
        }: {
          description?: string;
          variables?: Record<string, string>;
        },
        { toolCallId },
      ) => {
        const agentVars: Record<string, string> =
          variables && typeof variables === "object" ? variables : {};
        let varsToApply = { ...agentVars };
        if (designModel?.vertex && designModel?.modelId) {
          const contextParts: string[] = [];
          if (description?.trim())
            contextParts.push(`Guidelines: ${description}`);
          if (Object.keys(agentVars).length > 0)
            contextParts.push(
              `Draft variables from agent (refine or keep): ${JSON.stringify(agentVars)}`,
            );
          const designPrompt = `Generate a complete CSS theme as a flat object. Required keys: ${THEME_KEYS}. Values: hex colors, rem for --radius, font family strings for --font-sans and --font-heading.\n\n${contextParts.join("\n\n")}`;
          const generated = await generateThemeWithDesignModel(
            designModel.vertex,
            designModel.modelId,
            designPrompt,
          );
          if (generated && Object.keys(generated).length > 0) {
            varsToApply = generated;
          }
        }
        if (!varsToApply || Object.keys(varsToApply).length === 0) {
          return {
            success: false,
            error:
              'variables is required. Pass an object like {"--primary":"#2563eb","--background":"#0f172a"}',
          };
        }
        const normalized = normalizeThemeVars(varsToApply);
        for (const k of Object.keys(theme)) delete theme[k];
        for (const [k, v] of Object.entries(normalized)) {
          theme[k] = v;
        }
        const result = {
          success: true,
          message: "Theme built",
          theme: { ...theme },
        };
        writer?.write({
          type: "data-tool-call-end",
          data: {
            toolCallId,
            toolName: "build_theme",
            theme: result.theme,
          },
        });
        return result;
      },
    }),
  };
}
