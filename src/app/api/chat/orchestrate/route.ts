import { createVertex } from "@ai-sdk/google-vertex";
import { isInitialPrompt } from "@/constants/agent-prompts";
import { runPlanningPipeline } from "@/lib/agent/planner";
import { decomposeTask } from "@/lib/agent/task-decomposer";
import type { ThemeVariables } from "@/lib/screen-utils";
import type { FrameState } from "@/lib/agent/tools";

export const runtime = "nodejs";

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = body?.prompt ?? "";
    const agentCount = Math.max(2, Math.min(6, body?.agentCount ?? 2));
    const initialFrames: FrameState[] = Array.isArray(body?.frames)
      ? body.frames
      : [];
    const theme: ThemeVariables = { ...(body?.theme ?? {}) };

    let planContext = "";
    let plannedScreens: Array<{ name: string; description: string }> = [];
    const planEvents: Array<{ type: string; data?: unknown }> = [];

    if (isInitialPrompt(initialFrames) && prompt.trim()) {
      const mockWriter = {
        write: (event: { type: string; [key: string]: unknown }) => {
          planEvents.push(event);
        },
      } as Parameters<typeof runPlanningPipeline>[2];

      const planning = await runPlanningPipeline(
        prompt,
        vertex,
        mockWriter,
        theme,
      );
      planContext = planning.planContext;

      const screensMatch = planContext.match(
        /Screens to create:\s*([\s\S]*?)(?:\n-\s*Visual|$)/,
      );
      if (screensMatch) {
        try {
          const jsonStr = planContext.match(
            /Screens to create:\s*(\[[\s\S]*?\])/,
          );
          if (jsonStr) {
            plannedScreens = JSON.parse(jsonStr[1]);
          }
        } catch {
        }
      }

      if (plannedScreens.length === 0) {
        for (const ev of planEvents) {
          const output = (
            ev as {
              output?: {
                screens?: Array<{ name: string; description: string }>;
              };
            }
          ).output;
          if (output?.screens) {
            plannedScreens = output.screens;
            break;
          }
        }
      }
    }

    const decomposition = await decomposeTask(
      prompt,
      agentCount,
      vertex,
      planContext,
      plannedScreens,
    );

    const FRAME_WIDTH = 393;
    const FRAME_GAP = 27;
    const FRAME_STEP = FRAME_WIDTH + FRAME_GAP;
    let globalScreenIndex = 0;

    const agentsWithPositions = decomposition.agents.map((agent) => ({
      ...agent,
      startLeft: globalScreenIndex * FRAME_STEP,
      screenPositions: agent.assignedScreens.map((_, si) => {
        const left = (globalScreenIndex + si) * FRAME_STEP;
        return { left, top: 0 };
      }),
      _advance: (() => {
        globalScreenIndex += agent.assignedScreens.length;
      })(),
    }));

    let builtTheme = { ...theme };
    if (Object.keys(builtTheme).length === 0) {
      for (const ev of planEvents) {
        const evData = ev as {
          type?: string;
          data?: { theme?: Record<string, string> };
          output?: { theme?: Record<string, string> };
        };
        if (evData.data?.theme && Object.keys(evData.data.theme).length > 0) {
          builtTheme = evData.data.theme;
          break;
        }
        if (
          evData.output?.theme &&
          Object.keys(evData.output.theme).length > 0
        ) {
          builtTheme = evData.output.theme;
          break;
        }
      }
    }

    return Response.json({
      orchestrationId: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
      agents: agentsWithPositions.map((a) => ({
        id: a.id,
        subTask: a.subTask,
        assignedScreens: a.assignedScreens,
        startLeft: a.startLeft,
        screenPositions: a.screenPositions,
      })),
      sharedContext: {
        planContext,
        theme: builtTheme,
        plannedScreens,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Orchestration error";
    return Response.json({ error: message }, { status: 500 });
  }
}
