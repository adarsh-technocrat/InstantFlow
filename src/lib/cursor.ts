import type { AppDispatch } from "@/store";
import {
  setMainChatAgentFrame,
  updateAgentActiveFrame,
  type FrameOverlayType,
} from "@/store/slices/agentSlice";

const MAIN_AGENT_ID = "main";

let _dispatch: AppDispatch | null = null;

export function initCursor(dispatch: AppDispatch) {
  _dispatch = dispatch;
}

function getDispatch(): AppDispatch {
  if (!_dispatch) throw new Error("cursor not initialized — call initCursor(dispatch) first");
  return _dispatch;
}

function isMainAgent(agentId: string) {
  return agentId === MAIN_AGENT_ID;
}

function dispatchFrame(
  agentId: string,
  frameId: string | null,
  status: "working" | "idle",
  overlay?: FrameOverlayType,
) {
  const d = getDispatch();
  if (isMainAgent(agentId)) {
    d(setMainChatAgentFrame({ frameId, status, overlay }));
  } else {
    d(updateAgentActiveFrame({ id: agentId, frameId, overlay }));
  }
}

export const cursor = {
  MAIN: MAIN_AGENT_ID,

  working(agentId = MAIN_AGENT_ID) {
    dispatchFrame(agentId, null, "working");
  },

  show(agentId: string, frameId: string) {
    dispatchFrame(agentId, frameId, "working");
  },

  scan(agentId: string, frameId: string) {
    dispatchFrame(agentId, frameId, "working", "scan");
  },

  design(agentId: string, frameId: string) {
    dispatchFrame(agentId, frameId, "working", "design");
  },

  hide(agentId = MAIN_AGENT_ID) {
    dispatchFrame(agentId, null, "idle");
  },
};

export type { FrameOverlayType };
