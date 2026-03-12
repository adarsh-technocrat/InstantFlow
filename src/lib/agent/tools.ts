/**
 * Tool definitions for the Sleek design agent.
 * Factory function creates tools with closures over mutable state.
 */

import { tool, generateImage, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import type { GoogleVertexProvider } from "@ai-sdk/google-vertex";
import {
  wrapScreenBody,
  extractBodyContent,
  normalizeThemeVars,
  type ThemeVariables,
} from "@/lib/screen-utils";
import {
  extractPartialScreenHtml,
  parseCreateScreenPartial,
  parseUpdateScreenPartial,
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
  imageMap: Record<string, string>;
  writer: UIMessageStreamWriter;
  vertex: GoogleVertexProvider;
}

const FRAME_SPACING = 420;
const STREAM_THROTTLE_MS = 120;

export function createTools(ctx: ToolContext) {
  const { frames, theme, imageMap, writer, vertex } = ctx;

  const createScreenStreamState = new Map<string, CreateScreenStreamState>();
  const updateScreenStreamState = new Map<string, UpdateScreenStreamState>();

  return {
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
      description:
        "Returns current CSS theme variables and fonts. No arguments needed.",
      inputSchema: z.object({}).passthrough(),
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
            payload: { id: frameId, label: "Loading…", left, top, html: "" },
          },
          transient: true,
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
        let changed = false;
        const parsed = parseCreateScreenPartial(state.buffer);
        if (parsed) {
          if (typeof parsed.name === "string" && parsed.name !== frame.label) {
            frame.label = parsed.name;
            changed = true;
          }
          if (
            typeof parsed.screen_html === "string" &&
            parsed.screen_html.length > 0
          ) {
            frame.html = wrapScreenBody(parsed.screen_html, theme);
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
            frame.html = wrapScreenBody(partialHtml, theme);
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
              payload: { id: toolCallId, html: frame.html, label: frame.label },
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
              payload: { id: toolCallId, html: wrappedHtml, label: name },
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
        { id, screen_html }: { id: string; screen_html: string },
        { toolCallId },
      ) => {
        updateScreenStreamState.delete(toolCallId);
        let html = screen_html;
        for (const [imgId, url] of Object.entries(imageMap)) {
          html = html.replace(new RegExp(`placeholder:${imgId}`, "g"), url);
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
        find: z.string().describe("Exact string to find (from read_screen)"),
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
          .record(z.string(), z.coerce.string())
          .describe("CSS variable names to values"),
      }),
      execute: async ({ updates }: { updates: Record<string, string> }) => {
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
        theme_vars: z.record(z.string(), z.coerce.string()),
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
        aspect_ratio: z
          .string()
          .describe("One of: square, landscape, portrait")
          .transform((v) => {
            const lower = v.toLowerCase().trim();
            if (["landscape", "16:9", "wide", "horizontal"].includes(lower))
              return "landscape";
            if (["portrait", "9:16", "tall", "vertical"].includes(lower))
              return "portrait";
            return "square";
          }),
        background: z
          .string()
          .describe("One of: opaque, transparent")
          .transform((v) => {
            const lower = v.toLowerCase().trim();
            return lower === "transparent" ? "transparent" : "opaque";
          }),
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
        // Try custom image gen API first
        if (process.env.IMAGE_GEN_API_URL) {
          try {
            const res = await fetch(process.env.IMAGE_GEN_API_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt, aspect_ratio, n: 1 }),
            });
            const data = await res.json();
            const url = data.url ?? data.data?.[0]?.url ?? data.output?.[0];
            if (url) {
              imageMap[id] = url;
              return { success: true, url };
            }
          } catch {
            // Fall through to next provider
          }
        }

        // Try Vertex Imagen
        if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
          try {
            const aspectRatioMap = {
              square: "1:1" as const,
              landscape: "16:9" as const,
              portrait: "9:16" as const,
            };
            const aspectRatio =
              aspectRatioMap[aspect_ratio as keyof typeof aspectRatioMap] ??
              "1:1";
            const imageModel = vertex.image("imagen-3.0-fast-generate-001");
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
            // Fall through to placeholder
          }
        }

        // Fallback to picsum placeholder
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
}
