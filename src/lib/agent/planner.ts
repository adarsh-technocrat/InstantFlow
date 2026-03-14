import { generateObject } from "ai";
import { z } from "zod";
import type { UIMessageStreamWriter } from "ai";
import type { GoogleVertexProvider } from "@ai-sdk/google-vertex";
import { normalizeThemeVars, type ThemeVariables } from "@/lib/screen-utils";

const PLANNER_CLASSIFY_PROMPT =
  'Given a user request for a mobile app, determine if they want to "generate" (create new screens) or "edit" (modify existing). Reply with intent only.';

const PLANNER_SCREENS_PROMPT =
  'Given a user request and that intent is "generate", list the screens to create. Each screen has name and description.';

const PLANNER_STYLE_PROMPT =
  "Given a user request and the screens to create, provide visual guidelines (colors, mood, typography) and whether to generate (true for new designs).";

const PLANNER_THEME_PROMPT = `\
Given visual guidelines for a mobile app, generate a complete CSS theme as a flat object.
Every key must be a CSS variable name starting with --.
All of these keys are required:
--background, --foreground, --primary, --primary-foreground, --secondary, --secondary-foreground,
--muted, --muted-foreground, --card, --card-foreground, --border, --radius, --font-sans, --font-heading.

Values should be hex colors for color tokens, rem values for --radius, and font family strings for fonts.
Example: {"--primary":"#2563eb","--background":"#0f172a","--radius":"0.75rem","--font-sans":"'Inter', sans-serif"}`;

let planCallCounter = 0;

function nextPlanCallId(step: string): string {
  return `plan-${step}-${++planCallCounter}`;
}

function emitPlanStart(
  writer: UIMessageStreamWriter,
  toolCallId: string,
  toolName: string,
) {
  writer.write({
    type: "tool-input-start",
    toolCallId,
    toolName,
  });
}

function emitPlanEnd(
  writer: UIMessageStreamWriter,
  toolCallId: string,
  _toolName: string,
  _output: object,
) {
  writer.write({
    type: "tool-output-available",
    toolCallId,
    output: _output,
  });
}

export interface PlanningResult {
  planContext: string;
}

export async function runPlanningPipeline(
  userPrompt: string,
  vertex: GoogleVertexProvider,
  writer: UIMessageStreamWriter,
  theme: ThemeVariables,
): Promise<PlanningResult> {
  const empty: PlanningResult = { planContext: "" };
  try {
    const classifyId = nextPlanCallId("classifyIntent");
    emitPlanStart(writer, classifyId, "classifyIntent");
    const classify = await generateObject({
      model: vertex("gemini-2.0-flash"),
      schema: z.object({ intent: z.enum(["generate", "edit"]) }),
      prompt: `${PLANNER_CLASSIFY_PROMPT}\n\nUser request:\n${userPrompt}`,
    });
    const intent = classify.object.intent;
    emitPlanEnd(writer, classifyId, "classifyIntent", { intent });

    let screens: Array<{ name: string; description: string }> = [];
    const screensId = nextPlanCallId("planScreens");
    emitPlanStart(writer, screensId, "planScreens");
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
    emitPlanEnd(writer, screensId, "planScreens", { screens });

    const styleId = nextPlanCallId("planStyle");
    emitPlanStart(writer, styleId, "planStyle");
    const stylePlan = await generateObject({
      model: vertex("gemini-2.0-flash"),
      schema: z.object({
        guidelines: z.string(),
        shouldGenerate: z.boolean(),
      }),
      prompt: `${PLANNER_STYLE_PROMPT}\n\nUser request:\n${userPrompt}\n\nScreens: ${JSON.stringify(screens)}\n\nOutput visual guidelines and whether to generate (true for new designs).`,
    });
    const { guidelines, shouldGenerate } = stylePlan.object;
    emitPlanEnd(writer, styleId, "planStyle", { guidelines, shouldGenerate });

    if (shouldGenerate) {
      const themeId = nextPlanCallId("build_theme");
      emitPlanStart(writer, themeId, "build_theme");
      const themePlan = await generateObject({
        model: vertex("gemini-2.0-flash"),
        schema: z.object({
          variables: z
            .record(z.string(), z.string())
            .describe("Flat CSS variable map"),
        }),
        prompt: `${PLANNER_THEME_PROMPT}\n\nVisual guidelines:\n${guidelines}\n\nUser request:\n${userPrompt}`,
      });
      const fromVariables =
        themePlan.object.variables &&
        typeof themePlan.object.variables === "object"
          ? (themePlan.object.variables as Record<string, string>)
          : {};
      const fromRoot =
        Object.keys(fromVariables).length > 0
          ? fromVariables
          : (() => {
              const obj = themePlan.object as Record<
                string,
                string | number | boolean | null | Record<string, string>
              >;
              const record: Record<string, string> = {};
              for (const [k, v] of Object.entries(obj)) {
                if (k.startsWith("--") && typeof v === "string") record[k] = v;
              }
              return record;
            })();
      const normalized = normalizeThemeVars(fromRoot);
      const builtTheme =
        Object.keys(normalized).length > 0
          ? (() => {
              for (const k of Object.keys(theme)) delete theme[k];
              for (const [k, v] of Object.entries(normalized)) theme[k] = v;
              return { ...theme };
            })()
          : { ...theme };
      emitPlanEnd(writer, themeId, "build_theme", {
        success: true,
        message: "Theme built",
        theme: builtTheme,
      });
      writer.write({
        type: "data-tool-call-end",
        data: {
          toolCallId: themeId,
          toolName: "build_theme",
          theme: builtTheme,
        },
      });
    }

    const planContext = `## Planning (from pipeline)\n- Intent: ${intent}\n- Screens to create: ${JSON.stringify(screens, null, 2)}\n- Visual guidelines: ${guidelines}\n- Theme: ${shouldGenerate ? "built and applied" : "skipped"}\n`;
    return { planContext };
  } catch {
    return empty;
  }
}
