import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { AGENT_PERSONAS } from "@/constants/agent-personas";

export type FrameOverlayType = "scan" | "design" | null;

export interface AgentInstance {
  id: string;
  name: string;
  emoji: string;
  color: string;
  subTask: string;
  assignedScreens: string[];
  assignedFrameIds: string[];
  screenPositions: Array<{ left: number; top: number }>;
  status: "idle" | "working" | "done" | "error";
  chatId: string;
  activeFrameId: string | null;
  activeOverlay: FrameOverlayType;
  cursorProgress: number;
}

export type MainChatAgentStatus = "idle" | "working";

interface AgentState {
  orchestrationId: string | null;
  agents: AgentInstance[];
  activeAgentId: string | null;
  agentCount: number;
  mainChatActiveFrameId: string | null;
  mainChatActiveOverlay: FrameOverlayType;
  mainChatStatus: MainChatAgentStatus;
}

const initialState: AgentState = {
  orchestrationId: null,
  agents: [],
  activeAgentId: null,
  agentCount: 1,
  mainChatActiveFrameId: null,
  mainChatActiveOverlay: null,
  mainChatStatus: "idle",
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
          assignedFrameIds?: string[];
          screenPositions?: Array<{ left: number; top: number }>;
        }>;
        keepOrchestratorActive?: boolean;
      }>,
    ) {
      const { orchestrationId, assignments, keepOrchestratorActive } =
        action.payload;
      state.orchestrationId = orchestrationId;
      if (!keepOrchestratorActive) {
        state.mainChatActiveFrameId = null;
        state.mainChatActiveOverlay = null;
        state.mainChatStatus = "idle";
      }
      state.agents = assignments.map((a, i) => {
        const persona = AGENT_PERSONAS[(i + 1) % AGENT_PERSONAS.length];
        return {
          id: a.id,
          name: persona.name,
          emoji: persona.emoji,
          color: persona.color,
          subTask: a.subTask,
          assignedScreens: a.assignedScreens,
          assignedFrameIds: a.assignedFrameIds ?? [],
          screenPositions: a.screenPositions ?? [],
          status: "idle" as const,
          chatId: `orch-${orchestrationId}-${persona.name.toLowerCase()}`,
          activeFrameId: null,
          activeOverlay: null,
          cursorProgress: 0,
        };
      });
      state.activeAgentId = keepOrchestratorActive
        ? null
        : (state.agents[0]?.id ?? null);
    },
    setActiveAgent(state, action: PayloadAction<string | null>) {
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
    updateAgentActiveFrame(
      state,
      action: PayloadAction<{
        id: string;
        frameId: string | null;
        overlay?: FrameOverlayType;
      }>,
    ) {
      const agent = state.agents.find((a) => a.id === action.payload.id);
      if (agent) {
        agent.activeFrameId = action.payload.frameId;
        agent.activeOverlay = action.payload.overlay ?? null;
        agent.cursorProgress = 0;
      }
    },
    updateAgentCursorProgress(
      state,
      action: PayloadAction<{ id: string; progress: number }>,
    ) {
      const agent = state.agents.find((a) => a.id === action.payload.id);
      if (agent) {
        agent.cursorProgress = Math.min(1, action.payload.progress);
      }
    },
    resetOrchestration(state) {
      state.orchestrationId = null;
      state.agents = [];
      state.activeAgentId = null;
      state.mainChatActiveFrameId = null;
      state.mainChatActiveOverlay = null;
      state.mainChatStatus = "idle";
    },
    setMainChatAgentFrame(
      state,
      action: PayloadAction<{
        frameId: string | null;
        status?: MainChatAgentStatus;
        overlay?: FrameOverlayType;
      }>,
    ) {
      const { frameId, status, overlay } = action.payload;
      if (frameId !== undefined) state.mainChatActiveFrameId = frameId;
      if (status !== undefined) state.mainChatStatus = status;
      if (overlay !== undefined) state.mainChatActiveOverlay = overlay;
      if (frameId === null) state.mainChatActiveOverlay = null;
    },
  },
});

export const {
  setAgentCount,
  initializeAgents,
  setActiveAgent,
  updateAgentStatus,
  updateAgentActiveFrame,
  updateAgentCursorProgress,
  resetOrchestration,
  setMainChatAgentFrame,
} = agentSlice.actions;

export default agentSlice.reducer;
