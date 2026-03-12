import { generateObject } from "ai";
import { z } from "zod";
import type { UIMessageStreamWriter } from "ai";
import type { GoogleVertexProvider } from "@ai-sdk/google-vertex";

const PLANNER_CLASSIFY_PROMPT =
  'Given a user request for a mobile app, determine if they want to "generate" (create new screens) or "edit" (modify existing). Reply with intent only.';

const PLANNER_SCREENS_PROMPT =
  'Given a user request and that intent is "generate", list the screens to create. Each screen has name and description.';

const PLANNER_STYLE_PROMPT =
  "Given a user request and the screens to create, provide visual guidelines (colors, mood, typography) and whether to generate (true for new designs).";

export async function runPlanningPipeline(
  userPrompt: string,
  vertex: GoogleVertexProvider,
  writer: UIMessageStreamWriter,
): Promise<string> {
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

    // Step 2: planScreens (only if generate)
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

    return `## Planning (from pipeline)\n- Intent: ${intent}\n- Screens to create: ${JSON.stringify(screens, null, 2)}\n- Visual guidelines: ${guidelines}\n`;
  } catch {
    return "";
  }
}
