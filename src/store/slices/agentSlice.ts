import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { AGENT_PERSONAS } from "@/constants/agent-personas";

export interface AgentInstance {
  id: string; // "pixel", "neon", etc.
  name: string; // "Pixel", "Neon", etc.
  emoji: string;
  color: string;
  subTask: string;
  assignedScreens: string[];
  status: "idle" | "working" | "done" | "error";
  chatId: string; // "orch-{orchestrationId}-{name}"
}

interface AgentState {
  orchestrationId: string | null;
  agents: AgentInstance[];
  activeAgentId: string | null;
  agentCount: number;
}

const initialState: AgentState = {
  orchestrationId: null,
  agents: [],
  activeAgentId: null,
  agentCount: 1,
};

const agentSlice = createSlice({
  name: "agent",
  initialState,
  reducers: {
    setAgentCount(state, action: PayloadAction<number>) {
      state.agentCount = Math.max(1, Math.min(6, action.payload));
    },
    initializeAgents(
      state,
      action: PayloadAction<{
        orchestrationId: string;
        assignments: Array<{
          id: string;
          subTask: string;
          assignedScreens: string[];
        }>;
      }>,
    ) {
      const { orchestrationId, assignments } = action.payload;
      state.orchestrationId = orchestrationId;
      state.agents = assignments.map((a, i) => {
        const persona = AGENT_PERSONAS[i % AGENT_PERSONAS.length];
        return {
          id: a.id,
          name: persona.name,
          emoji: persona.emoji,
          color: persona.color,
          subTask: a.subTask,
          assignedScreens: a.assignedScreens,
          status: "idle" as const,
          chatId: `orch-${orchestrationId}-${persona.name.toLowerCase()}`,
        };
      });
      state.activeAgentId = state.agents[0]?.id ?? null;
    },
    setActiveAgent(state, action: PayloadAction<string>) {
      state.activeAgentId = action.payload;
    },
    updateAgentStatus(
      state,
      action: PayloadAction<{
        id: string;
        status: AgentInstance["status"];
      }>,
    ) {
      const agent = state.agents.find((a) => a.id === action.payload.id);
      if (agent) agent.status = action.payload.status;
    },
    resetOrchestration(state) {
      state.orchestrationId = null;
      state.agents = [];
      state.activeAgentId = null;
    },
  },
});

export const {
  setAgentCount,
  initializeAgents,
  setActiveAgent,
  updateAgentStatus,
  resetOrchestration,
} = agentSlice.actions;

export default agentSlice.reducer;
