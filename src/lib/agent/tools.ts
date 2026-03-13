/**
 * Tool definitions for the Sleek design agent.
 * Factory function creates tools with closures over mutable state.
 */

import { tool } from "ai";
import type { UIMessageStreamWriter } from "ai";
import { z } from "zod";
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
  writer?: UIMessageStreamWriter;
}

const FRAME_SPACING = 420;
const STREAM_THROTTLE_MS = 120;

export function createTools(ctx: ToolContext) {
  const { frames, theme, writer } = ctx;

  const createScreenStreamState = new Map<string, CreateScreenStreamState>();
  const updateScreenStreamState = new Map<string, UpdateScreenStreamState>();

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
      execute: async ({ id }: { id: string }, { toolCallId }) => {
        const frame = frames.find((f) => f.id === id);
        const html = frame?.html ? extractBodyContent(frame.html) : "";
        const result = html || "(empty screen)";
        writer?.write({
          type: "tool-output-available",
          toolCallId,
          output: result,
        });
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
      execute: async (_, { toolCallId }) => {
        const result = JSON.stringify(theme, null, 2);
        writer?.write({
          type: "tool-output-available",
          toolCallId,
          output: result,
        });
        return result;
      },
    }),

    create_screen: tool({
      description:
        "Creates a new screen. screen_html is inner body content only (no html, head, or body tags).",
      inputSchema: z.object({
        name: z.string().describe("Screen label/name"),
        screen_html: z.string().describe("HTML for body content only"),
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
        }
      },
      execute: async (
        { name, screen_html }: { name: string; screen_html: string },
        { toolCallId },
      ) => {
        const wrappedHtml = wrapScreenBody(screen_html, theme);
        const frame = frames.find((f) => f.id === toolCallId);
        if (frame) {
          frame.label = name;
          frame.html = wrappedHtml;
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
        writer?.write({
          type: "tool-output-available",
          toolCallId,
          output: result,
        });
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
        "Replaces the ENTIRE screen body. Use only for broad layout redesigns. Do NOT use for small targeted edits.",
      inputSchema: z.object({
        id: z.string().describe("Frame id"),
        screen_html: z.string().describe("HTML for body content only"),
      }),
      onInputStart: ({ toolCallId }) => {
        writer?.write({
          type: "tool-input-start",
          toolCallId,
          toolName: "update_screen",
        });
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
      },
      execute: async (
        { id, screen_html }: { id: string; screen_html: string },
        { toolCallId },
      ) => {
        updateScreenStreamState.delete(toolCallId);
        const frame = frames.find((f) => f.id === id);
        if (frame) {
          frame.html = wrapScreenBody(screen_html, theme);
        }
        const result = {
          success: true,
          frame: frame ? { id: frame.id, html: frame.html } : undefined,
        };
        writer?.write({
          type: "tool-output-available",
          toolCallId,
          output: result,
        });
        if (result.frame) {
          writer?.write({
            type: "data-tool-call-end",
            data: {
              toolCallId,
              toolName: "update_screen",
              frame: result.frame,
            },
          });
        }
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
        const frame = frames.find((f) => f.id === id);
        if (!frame?.html) {
          const err = { success: false, error: "Screen not found" };
          writer?.write({
            type: "tool-output-available",
            toolCallId,
            output: err,
          });
          return err;
        }
        if (!frame.html.includes(find)) {
          const err = {
            success: false,
            error:
              "Find string not found - ensure exact match from read_screen",
          };
          writer?.write({
            type: "tool-output-available",
            toolCallId,
            output: err,
          });
          return err;
        }
        const newHtml = frame.html.replace(find, replace);
        frame.html = newHtml;
        const result = {
          success: true,
          frame: { id: frame.id, html: frame.html },
        };
        writer?.write({
          type: "tool-output-available",
          toolCallId,
          output: result,
        });
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
        for (const k of Object.keys(updates)) {
          const v = updates[k];
          if (v !== undefined) theme[k] = String(v);
        }
        const result = { success: true, themeUpdates: { ...updates } };
        writer?.write({
          type: "tool-output-available",
          toolCallId,
          output: result,
        });
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
          variables = {},
        }: {
          description?: string;
          variables?: Record<string, string>;
        },
        { toolCallId },
      ) => {
        if (!variables || typeof variables !== "object") {
          const err = {
            success: false,
            error:
              'variables is required. Pass an object like {"--primary":"#2563eb","--background":"#0f172a"}',
          };
          writer?.write({
            type: "tool-output-available",
            toolCallId,
            output: err,
          });
          return err;
        }
        const normalized = normalizeThemeVars(variables);
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
          type: "tool-output-available",
          toolCallId,
          output: result,
        });
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
