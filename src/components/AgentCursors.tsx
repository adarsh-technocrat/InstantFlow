"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { FRAME_WIDTH, FRAME_HEIGHT } from "@/lib/canvas-utils";
import type { AgentInstance } from "@/store/slices/agentSlice";
import { AGENT_PERSONAS } from "@/constants/agent-personas";

export interface CursorElementInfo {
  left: number;
  top: number;
  width: number;
  height: number;
  elementId: string;
}

export const cursorPositions = new Map<string, CursorElementInfo>();

let positionListeners: Array<() => void> = [];

export function subscribeToCursorPositions(cb: () => void) {
  positionListeners.push(cb);
  return () => {
    positionListeners = positionListeners.filter((l) => l !== cb);
  };
}

function notifyListeners() {
  for (const l of positionListeners) l();
}

let listenerInstalled = false;
function installGlobalListener() {
  if (listenerInstalled) return;
  listenerInstalled = true;
  window.addEventListener("message", (e: MessageEvent) => {
    if (e.data?.type !== "cursor-element-track") return;
    const { frameId, rect, elementId } = e.data;
    if (!frameId || !rect) return;
    cursorPositions.set(frameId, { ...rect, elementId: elementId || "" });
    notifyListeners();
  });
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const FADE_OUT_MS = 600;

function AgentCursor({
  agent,
  frames,
  isFadingOut,
  onFadeComplete,
}: {
  agent: AgentInstance;
  frames: Array<{
    id: string;
    label: string;
    left: number;
    top: number;
    width?: number;
    height?: number;
  }>;
  isFadingOut?: boolean;
  onFadeComplete?: () => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isFadingOut) return;
    const el = elRef.current;
    if (el) {
      el.style.transition = `opacity ${FADE_OUT_MS}ms ease-out`;
      el.style.opacity = "0";
    }
    const timer = setTimeout(() => onFadeComplete?.(), FADE_OUT_MS);
    return () => clearTimeout(timer);
  }, [isFadingOut, onFadeComplete]);

  const currentPos = useRef({ x: 0, y: 0 });
  const targetPos = useRef({ x: 0, y: 0 });
  const hasInitialized = useRef(false);
  const rafRef = useRef<number>(0);
  const lastValidPos = useRef<{ x: number; y: number } | null>(null);

  const computeTarget = useCallback(() => {
    const frame = frames.find((f) => f.id === agent.activeFrameId);
    if (!frame) return lastValidPos.current;

    const frameW = frame.width ?? FRAME_WIDTH;
    const frameH = frame.height ?? FRAME_HEIGHT;
    const elemRect = cursorPositions.get(frame.id);
    const isValid = elemRect && (elemRect.width >= 1 || elemRect.height >= 1);

    if (isValid) {
      let x = frame.left + elemRect.left + elemRect.width;
      let y = frame.top + elemRect.top + elemRect.height * 0.5;
      x = Math.max(frame.left, Math.min(x, frame.left + frameW + 12));
      y = Math.max(frame.top + 20, Math.min(y, frame.top + frameH - 20));
      const pos = { x, y };
      lastValidPos.current = pos;
      return pos;
    }

    if (lastValidPos.current) return lastValidPos.current;

    const fallback = { x: frame.left + frameW * 0.5, y: frame.top + 80 };
    lastValidPos.current = fallback;
    return fallback;
  }, [agent.activeFrameId, frames]);

  useEffect(() => {
    let running = true;
    let lastTime = 0;

    const tick = (time: number) => {
      if (!running) return;

      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0.016;
      lastTime = time;

      const el = elRef.current;
      if (!el) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const speed = 4.5;
      const t = 1 - Math.exp(-speed * dt);

      const tx = targetPos.current.x;
      const ty = targetPos.current.y;
      const cx = currentPos.current.x;
      const cy = currentPos.current.y;

      const dx = Math.abs(tx - cx);
      const dy = Math.abs(ty - cy);

      if (dx < 0.5 && dy < 0.5) {
        currentPos.current.x = tx;
        currentPos.current.y = ty;
      } else {
        currentPos.current.x = lerp(cx, tx, t);
        currentPos.current.y = lerp(cy, ty, t);
      }

      el.style.transform = `translate3d(${currentPos.current.x}px, ${currentPos.current.y}px, 0)`;

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const update = () => {
      const pos = computeTarget();
      if (!pos) return;

      if (!hasInitialized.current) {
        hasInitialized.current = true;
        currentPos.current = { ...pos };
        targetPos.current = { ...pos };
        const el = elRef.current;
        if (el) {
          el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
        }
      } else {
        targetPos.current = { ...pos };
      }
    };

    update();

    return subscribeToCursorPositions(update);
  }, [computeTarget]);

  useEffect(() => {
    const pos = computeTarget();
    if (pos) {
      targetPos.current = { ...pos };
    }
  }, [agent.activeFrameId, computeTarget]);

  return (
    <div
      ref={elRef}
      className="pointer-events-none absolute left-0 top-0 z-[60]"
      style={{
        willChange: "transform",
      }}
    >
      <svg
        width="24"
        height="30"
        viewBox="0 0 16 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        <path
          d="M1.5 1L5.5 18L8.5 11L15 9.5L1.5 1Z"
          fill={agent.color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      <div
        className="ml-4 -mt-0.5 flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-lg"
        style={{ backgroundColor: agent.color }}
      >
        {agent.name}
      </div>
    </div>
  );
}

const SINGLE_AGENT_VIRTUAL_ID = "main";

export function AgentCursors() {
  const agents = useAppSelector((s) => s.agent.agents);
  const frames = useAppSelector((s) => s.canvas.frames);
  const mainChatActiveFrameId = useAppSelector(
    (s) => s.agent.mainChatActiveFrameId,
  );
  const mainChatStatus = useAppSelector((s) => s.agent.mainChatStatus);

  const [fadingAgents, setFadingAgents] = useState<Map<string, AgentInstance>>(
    new Map(),
  );
  const prevVisibleRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    installGlobalListener();
  }, []);

  const activeAgents = useMemo(() => {
    const fromStore = agents.filter(
      (a) => a.status === "working" && a.activeFrameId,
    );
    const result = [...fromStore];
    if (mainChatStatus === "working" && mainChatActiveFrameId) {
      const persona = AGENT_PERSONAS[0];
      result.push({
        id: SINGLE_AGENT_VIRTUAL_ID,
        name: persona.name,
        emoji: persona.emoji,
        color: persona.color,
        subTask: "",
        assignedScreens: [],
        assignedFrameIds: [],
        screenPositions: [],
        status: "working" as const,
        chatId: "main",
        activeFrameId: mainChatActiveFrameId,
        activeOverlay: null,
        cursorProgress: 0,
      } as AgentInstance);
    }
    return result;
  }, [agents, mainChatStatus, mainChatActiveFrameId]);

  useEffect(() => {
    const currentIds = new Set(activeAgents.map((a) => a.id));
    const prevIds = prevVisibleRef.current;

    for (const prevId of prevIds) {
      if (!currentIds.has(prevId) && !fadingAgents.has(prevId)) {
        const snapshot =
          agents.find((a) => a.id === prevId) ??
          (prevId === SINGLE_AGENT_VIRTUAL_ID
            ? ({
                id: SINGLE_AGENT_VIRTUAL_ID,
                name: AGENT_PERSONAS[0].name,
                emoji: AGENT_PERSONAS[0].emoji,
                color: AGENT_PERSONAS[0].color,
                subTask: "",
                assignedScreens: [],
                assignedFrameIds: [],
                screenPositions: [],
                status: "done" as const,
                chatId: "main",
                activeFrameId: mainChatActiveFrameId,
                activeOverlay: null,
                cursorProgress: 0,
              } as AgentInstance)
            : null);
        if (snapshot?.activeFrameId) {
          setFadingAgents((prev) => new Map(prev).set(prevId, snapshot));
        }
      }
    }

    prevVisibleRef.current = currentIds;
  }, [activeAgents, agents, fadingAgents, mainChatActiveFrameId]);

  const handleFadeComplete = useCallback((agentId: string) => {
    setFadingAgents((prev) => {
      const next = new Map(prev);
      next.delete(agentId);
      return next;
    });
  }, []);

  if (activeAgents.length === 0 && fadingAgents.size === 0) return null;

  return (
    <>
      {activeAgents.map((agent) => (
        <AgentCursor key={agent.id} agent={agent} frames={frames} />
      ))}
      {Array.from(fadingAgents.values()).map((agent) => (
        <AgentCursor
          key={`fade-${agent.id}`}
          agent={agent}
          frames={frames}
          isFadingOut
          onFadeComplete={() => handleFadeComplete(agent.id)}
        />
      ))}
    </>
  );
}
