import { generateObject } from "ai";
import { z } from "zod";
import type { GoogleVertexProvider } from "@ai-sdk/google-vertex";

const TASK_DECOMPOSITION_PROMPT = `\
You are a task decomposition engine for a mobile app design tool.
Given a user prompt and a number of agents, split the work into non-overlapping sub-tasks.

Rules:
- Each agent gets a clear, self-contained sub-task with specific screens to create.
- Divide screens as equally as possible among agents.
- Agent 1 (index 0) is ALWAYS responsible for theme creation (build_theme). No other agent should touch the theme.
- Screen names must not overlap between agents.
- Each sub-task should contain enough context for the agent to work independently.
- Include the visual style description in each sub-task so agents maintain consistency.
- If there are more agents than screens, assign empty tasks to extra agents.`;

export interface AgentAssignment {
  id: string;
  subTask: string;
  assignedScreens: string[];
}

export interface DecompositionResult {
  agents: AgentAssignment[];
  planContext: string;
}

export async function decomposeTask(
  userPrompt: string,
  agentCount: number,
  vertex: GoogleVertexProvider,
  planContext: string,
  plannedScreens: Array<{ name: string; description: string }>,
): Promise<DecompositionResult> {
  const screenList = plannedScreens
    .map((s) => `- ${s.name}: ${s.description}`)
    .join("\n");

  const result = await generateObject({
    model: vertex("gemini-2.0-flash"),
    schema: z.object({
      assignments: z.array(
        z.object({
          agentIndex: z.number().describe("0-based index of the agent"),
          subTask: z
            .string()
            .describe(
              "Complete instructions for this agent, including which screens to create and any style context",
            ),
          assignedScreens: z
            .array(z.string())
            .describe("Screen names this agent is responsible for"),
        }),
      ),
    }),
    prompt: `${TASK_DECOMPOSITION_PROMPT}

User request: ${userPrompt}

Number of agents: ${agentCount}

Planning context:
${planContext}

Screens to create:
${screenList}

Split these ${plannedScreens.length} screens among ${agentCount} agents. Agent 0 handles theme + its screens. Each agent gets a detailed sub-task.`,
  });

  const agents: AgentAssignment[] = result.object.assignments.map((a, i) => ({
    id: String(i),
    subTask: a.subTask,
    assignedScreens: a.assignedScreens,
  }));

  return { agents, planContext };
}
