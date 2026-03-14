"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import { FRAME_WIDTH, FRAME_HEIGHT } from "@/lib/canvas-utils";

const FRAME_BORDER_RADIUS = 40;
const SHUTTER_DURATION_MS = 1800;
const FADE_OUT_MS = 400;

function FrameShutterOnce({
  frameId,
  left,
  top,
  width,
  height,
  color,
  onDone,
}: {
  frameId: string;
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  onDone: (frameId: string) => void;
}) {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const sweepTimer = setTimeout(() => {
      setFadingOut(true);
    }, SHUTTER_DURATION_MS);

    const removeTimer = setTimeout(() => {
      onDone(frameId);
    }, SHUTTER_DURATION_MS + FADE_OUT_MS);

    return () => {
      clearTimeout(sweepTimer);
      clearTimeout(removeTimer);
    };
  }, [frameId, onDone]);

  return (
    <div
      className="pointer-events-none absolute z-[55] overflow-hidden"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: `${FRAME_BORDER_RADIUS}px`,
        border: `1.5px solid ${color}60`,
        boxShadow: `0 0 16px ${color}25`,
        opacity: fadingOut ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms ease-out`,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 w-full"
        style={{
          background: `linear-gradient(to bottom, ${color}35, ${color}05)`,
          animation: `shutter-grow ${SHUTTER_DURATION_MS}ms ease-out forwards`,
        }}
      />
      <div
        className="absolute left-0 right-0"
        style={{
          height: "2px",
          background: `linear-gradient(90deg, transparent 0%, ${color} 20%, ${color} 80%, transparent 100%)`,
          boxShadow: `0 0 8px 1px ${color}90, 0 0 20px 2px ${color}40`,
          animation: `shutter-line ${SHUTTER_DURATION_MS}ms ease-out forwards`,
        }}
      />
    </div>
  );
}

const SINGLE_AGENT_PERSONA_COLOR = "#8A87F8";

export function AgentShutterOverlays() {
  const agents = useAppSelector((s) => s.agent.agents);
  const frames = useAppSelector((s) => s.canvas.frames);
  const mainChatActiveFrameId = useAppSelector(
    (s) => s.agent.mainChatActiveFrameId,
  );
  const mainChatStatus = useAppSelector((s) => s.agent.mainChatStatus);

  const playedRef = useRef(new Set<string>());

  const [activeShutters, setActiveShutters] = useState<
    Map<
      string,
      {
        left: number;
        top: number;
        width: number;
        height: number;
        color: string;
      }
    >
  >(new Map());

  useEffect(() => {
    const workingAgents = agents.filter(
      (a) => a.status === "working" && a.activeFrameId,
    );
    const singleAgentFrame =
      agents.length === 0 &&
      mainChatStatus === "working" &&
      mainChatActiveFrameId
        ? { frameId: mainChatActiveFrameId, color: SINGLE_AGENT_PERSONA_COLOR }
        : null;

    let changed = false;
    const next = new Map(activeShutters);

    for (const agent of workingAgents) {
      const fid = agent.activeFrameId!;
      if (playedRef.current.has(fid) || next.has(fid)) continue;

      const frame = frames.find((f) => f.id === fid);
      if (!frame) continue;

      next.set(fid, {
        left: frame.left,
        top: frame.top,
        width: frame.width ?? FRAME_WIDTH,
        height: frame.height ?? FRAME_HEIGHT,
        color: agent.color,
      });
      changed = true;
    }

    if (singleAgentFrame) {
      const fid = singleAgentFrame.frameId;
      if (!playedRef.current.has(fid) && !next.has(fid)) {
        const frame = frames.find((f) => f.id === fid);
        if (frame) {
          next.set(fid, {
            left: frame.left,
            top: frame.top,
            width: frame.width ?? FRAME_WIDTH,
            height: frame.height ?? FRAME_HEIGHT,
            color: singleAgentFrame.color,
          });
          changed = true;
        }
      }
    }

    if (changed) queueMicrotask(() => setActiveShutters(next));
  }, [agents, frames, activeShutters, mainChatActiveFrameId, mainChatStatus]);

  const handleDone = useCallback((frameId: string) => {
    playedRef.current.add(frameId);
    setActiveShutters((prev) => {
      const next = new Map(prev);
      next.delete(frameId);
      return next;
    });
  }, []);

  if (activeShutters.size === 0) return null;

  return (
    <>
      {Array.from(activeShutters.entries()).map(([fid, info]) => (
        <FrameShutterOnce
          key={fid}
          frameId={fid}
          left={info.left}
          top={info.top}
          width={info.width}
          height={info.height}
          color={info.color}
          onDone={handleDone}
        />
      ))}
    </>
  );
}
