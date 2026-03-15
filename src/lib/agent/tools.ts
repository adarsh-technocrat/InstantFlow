import { tool, generateText, generateObject, streamText } from "ai";
import type { UIMessageStreamWriter } from "ai";
import type { GoogleVertexProvider } from "@ai-sdk/google-vertex";
import { z } from "zod";
import { FRAME_STEP } from "@/lib/canvas-utils";
import {
  wrapScreenBody,
  extractBodyContent,
  normalizeThemeVars,
  truncatePartialHtml,
  type ThemeVariables,
} from "@/lib/screen-utils";
import { type UpdateScreenStreamState } from "./stream-helpers";

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
  designModel?: {
    vertex: GoogleVertexProvider;
    modelId: string;
  };
  screenPositions?: Array<{ left: number; top: number }>;
  allowSpawnAgents?: boolean;
  excludeCreateScreen?: boolean;
}

function stripHtmlMarkdown(raw: string): string {
  const trimmed = raw.trim();
  return trimmed
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

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

function stripLeadingMarkdownFence(raw: string): string {
  return raw.replace(/^```(?:html)?\s*/i, "");
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
      const cleaned = truncatePartialHtml(
        stripLeadingMarkdownFence(accumulated),
      );
      if (cleaned) onChunk(cleaned);
    }
    if (accumulated) onChunk(stripLeadingMarkdownFence(accumulated));
    const out = stripHtmlMarkdown(accumulated);
    return out || null;
  } catch {
    return null;
  }
}

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

const DESIGN_MODEL_PROVIDER_OPTIONS = {
  google: {
    thinkingConfig: {
      includeThoughts: false,
      thinkingBudget: 0,
    },
  },
} as const;

export function createTools(ctx: ToolContext) {
  const {
    frames,
    theme,
    writer,
    designModel,
    allowSpawnAgents,
    excludeCreateScreen,
  } = ctx;

  const updateScreenStreamState = new Map<string, UpdateScreenStreamState>();
  const editScreenStreamBuffer = new Map<string, string>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const screenCreationTools: Record<string, any> = excludeCreateScreen
    ? {}
    : {
        create_all_screens: tool({
          description:
            "Creates multiple placeholder screens on the canvas at once. Use this in multi-agent mode to create all frames before spawning agents. Returns frame IDs for each screen.",
          inputSchema: z.object({
            screens: z
              .array(
                z.object({
                  name: z.string().describe("Screen label/name"),
                  description: z
                    .string()
                    .describe("Brief description of the screen"),
                }),
              )
              .min(1)
              .max(12),
          }),
          onInputStart: ({ toolCallId }) => {
            writer?.write({
              type: "tool-input-start",
              toolCallId,
              toolName: "create_all_screens",
            });
          },
          execute: async (
            {
              screens,
            }: { screens: Array<{ name: string; description: string }> },
            { toolCallId },
          ) => {
            const startIndex = frames.length;
            const results = screens.map((screen, i) => {
              const id = `${toolCallId}-${i}`;
              const left = (startIndex + i) * FRAME_STEP;
              const top = 0;
              frames.push({ id, label: screen.name, left, top, html: "" });
              writer?.write({
                type: "data-tool-call-end",
                data: {
                  toolCallId: id,
                  toolName: "create_all_screens",
                  frame: { id, label: screen.name, left, top, html: "" },
                },
              } as Parameters<typeof writer.write>[0]);
              return { name: screen.name, frameId: id, left, top };
            });
            return { success: true, screens: results };
          },
        }),
      };

  return {
    ...screenCreationTools,

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
      execute: async (
        { id }: { id: string },
        { toolCallId }: { toolCallId: string },
      ) => {
        writer?.write({
          type: "data-tool-call-start",
          data: { toolCallId, toolName: "read_screen" },
        });
        const frame = frames.find((f) => f.id === id);
        const html = frame?.html ? extractBodyContent(frame.html) : "";
        const result = html || "(empty screen)";
        writer?.write({
          type: "data-tool-call-end",
          data: { toolCallId, toolName: "read_screen", id },
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
      execute: async () => {
        const result = JSON.stringify(theme, null, 2);
        return result;
      },
    }),

    design_screen: tool({
      description:
        "Generates the full design for an existing screen frame. Use this to design screens created by create_all_screens. The design model generates the HTML from the description. Streams the design live into the frame.",
      inputSchema: z.object({
        id: z.string().describe("Frame id (from create_all_screens result)"),
        description: z
          .string()
          .describe(
            "Full description of the screen content and layout to generate.",
          ),
      }),
      onInputStart: ({ toolCallId }) => {
        writer?.write({
          type: "tool-input-start",
          toolCallId,
          toolName: "design_screen",
        });
      },
      execute: async (
        { id, description }: { id: string; description: string },
        { toolCallId },
      ) => {
        const frame = frames.find((f) => f.id === id);
        if (!frame) {
          return { success: false, error: "Frame not found" };
        }
        if (!designModel?.vertex || !designModel?.modelId) {
          return {
            success: false,
            error: "Design model is required for design_screen.",
          };
        }
        const designPrompt = `You are a mobile UI designer. Generate the inner body HTML (no html/head/body tags) for a screen named "${frame.label}".\n\nDescription: ${description}\n\nUse Tailwind classes and iconify-icon where needed. Output only the complete inner body HTML, no markdown or explanation.`;
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
                toolName: "design_screen",
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
          frame: {
            id: frame.id,
            label: frame.label,
            left: frame.left,
            top: frame.top,
            html: frame.html,
          },
        };
        writer?.write({
          type: "data-tool-call-end",
          data: {
            toolCallId,
            toolName: "design_screen",
            frame: result.frame,
          },
        });
        return result;
      },
    }),

    update_screen: tool({
      description:
        "Replaces the ENTIRE screen body based on a description of the changes. Use only for broad layout redesigns on screens that already have content. Do NOT use for small targeted edits (use edit_design instead). The design model generates the new HTML from the current screen and your description.",
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
        if (!frame) {
          return { success: false, error: "Screen not found" };
        }
        if (!designModel?.vertex || !designModel?.modelId) {
          return {
            success: false,
            error: "Design model is required for update_screen.",
          };
        }
        const currentBody = frame.html ? extractBodyContent(frame.html) : "";
        const designPrompt = currentBody
          ? `You are a mobile UI designer. Update this screen's inner body HTML according to the description below. Output the complete updated inner body HTML only, no markdown or explanation.\n\nDescription of changes: ${description}\n\nCurrent inner body HTML:\n${currentBody}`
          : `You are a mobile UI designer. Generate the inner body HTML (no html/head/body tags) for a screen named "${frame.label}".\n\nDescription: ${description}\n\nUse Tailwind classes and iconify-icon where needed. Output only the complete inner body HTML, no markdown or explanation.`;
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

    edit_design: tool({
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
          toolName: "edit_design",
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
        process.stdout.write("\n");
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
            toolName: "edit_design",
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

    ...(allowSpawnAgents
      ? {
          spawn_agents: tool({
            description:
              "Start multiple agents to work in parallel on different screens or sub-tasks. Call this when you have a plan and want to delegate work to specialist agents (e.g. one per screen or per feature). Pass the list of agents with each agent's subTask and assignedScreens. The agents will run in parallel; the current chat stays open so you can spawn more or monitor. Use after you have created screens and have a clear task breakdown.",
            inputSchema: z.object({
              agents: z
                .array(
                  z.object({
                    subTask: z
                      .string()
                      .describe(
                        "Clear task for this agent (e.g. build Home Search screen)",
                      ),
                    assignedScreens: z
                      .array(z.string())
                      .describe(
                        "Screen labels or ids this agent owns (e.g. ['Home Search', 'Train Listing'])",
                      ),
                    assignedFrameIds: z
                      .array(z.string())
                      .optional()
                      .default([])
                      .describe(
                        "Canvas frame IDs for assigned screens (from create_all_screens results)",
                      ),
                  }),
                )
                .min(1)
                .max(6)
                .describe(
                  "List of agents to spawn with their tasks and screen assignments",
                ),
              planContext: z
                .string()
                .optional()
                .describe(
                  "Optional shared context or plan summary for all agents",
                ),
            }),
            onInputStart: ({ toolCallId }) => {
              writer?.write({
                type: "tool-input-start",
                toolCallId,
                toolName: "spawn_agents",
              });
            },
            execute: async (
              {
                agents: agentInputs,
                planContext = "",
              }: {
                agents: Array<{
                  subTask: string;
                  assignedScreens: string[];
                  assignedFrameIds?: string[];
                }>;
                planContext?: string;
              },
              { toolCallId: _toolCallId },
            ) => {
              const orchestrationId = crypto
                .randomUUID()
                .replace(/-/g, "")
                .slice(0, 12);
              let globalScreenIndex = 0;
              const agentsWithPositions = agentInputs.map((a, i) => {
                const positions = (a.assignedScreens || []).map((_, si) => ({
                  left: (globalScreenIndex + si) * FRAME_STEP,
                  top: 0,
                }));
                globalScreenIndex += a.assignedScreens?.length ?? 0;
                return {
                  id: String(i),
                  subTask: a.subTask,
                  assignedScreens: a.assignedScreens ?? [],
                  assignedFrameIds: a.assignedFrameIds ?? [],
                  screenPositions: positions,
                };
              });
              const result = {
                success: true,
                orchestrationId,
                agents: agentsWithPositions,
                planContext,
                theme: { ...theme },
              };
              writer?.write({
                type: "data-spawn-agents",
                data: result,
              } as Parameters<typeof writer.write>[0]);
              return result;
            },
          }),
        }
      : {}),
  };
}
