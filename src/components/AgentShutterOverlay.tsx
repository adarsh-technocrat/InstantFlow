"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import { FRAME_WIDTH, FRAME_HEIGHT } from "@/lib/canvas-utils";
import type { FrameOverlayType } from "@/store/slices/agentSlice";

const FRAME_BORDER_RADIUS = 40;
const FADE_OUT_MS = 400;
const SCAN_DURATION_MS = 1800;

function ScanOverlay({
  left,
  top,
  width,
  height,
  color,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
}) {
  return (
    <div
      className="pointer-events-none absolute z-[55] overflow-hidden"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: `${FRAME_BORDER_RADIUS}px`,
        border: `2px solid ${color}80`,
        boxShadow: `0 0 24px ${color}40, inset 0 0 60px ${color}12`,
      }}
    >
      {/* Full-frame tint so the whole screen is clearly in "scan" state */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, ${color}28 0%, ${color}18 50%, ${color}28 100%)`,
        }}
      />
      {/* Growing fill behind the scan line */}
      <div
        className="absolute inset-x-0 top-0 w-full"
        style={{
          background: `linear-gradient(to bottom, ${color}40, ${color}08)`,
          animation: `shutter-grow ${SCAN_DURATION_MS}ms ease-out forwards`,
        }}
      />
      {/* Scan line that moves down */}
      <div
        className="absolute left-0 right-0"
        style={{
          height: "4px",
          background: `linear-gradient(90deg, transparent 0%, ${color} 15%, ${color} 85%, transparent 100%)`,
          boxShadow: `0 0 12px 2px ${color}99, 0 0 24px 4px ${color}50`,
          animation: `shutter-line ${SCAN_DURATION_MS}ms ease-out forwards`,
        }}
      />
    </div>
  );
}

function DesignOverlay({
  left,
  top,
  width,
  height,
  label,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
}) {
  return (
    <div
      className="pointer-events-none absolute z-[55]"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: `${FRAME_BORDER_RADIUS}px`,
      }}
    >
      <div
        className="overlay-sheet-card"
        style={{ borderRadius: `${FRAME_BORDER_RADIUS}px` }}
      >
        <div className="overlay-sheet-blob overlay-sheet-blob-1">
          <div className="overlay-sheet-blob-inner" />
        </div>
        <div className="overlay-sheet-blob overlay-sheet-blob-2">
          <div className="overlay-sheet-blob-inner" />
        </div>
        <div
          className="overlay-sheet-glow-rim"
          style={{ borderRadius: `${FRAME_BORDER_RADIUS}px` }}
        />
        <div
          className="overlay-sheet-tint"
          style={{ borderRadius: `${FRAME_BORDER_RADIUS}px` }}
        />
        <div className="overlay-sheet-content">
          <span className="overlay-sheet-label">Designing {label}…</span>
        </div>
      </div>
    </div>
  );
}

interface OverlayEntry {
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  label: string;
  type: FrameOverlayType;
  fadingOut: boolean;
}

const SINGLE_AGENT_COLOR = "#8A87F8";

export function AgentShutterOverlays() {
  const agents = useAppSelector((s) => s.agent.agents);
  const frames = useAppSelector((s) => s.canvas.frames);
  const mainChatActiveFrameId = useAppSelector(
    (s) => s.agent.mainChatActiveFrameId,
  );
  const mainChatActiveOverlay = useAppSelector(
    (s) => s.agent.mainChatActiveOverlay,
  );
  const mainChatStatus = useAppSelector((s) => s.agent.mainChatStatus);

  const [overlays, setOverlays] = useState<Map<string, OverlayEntry>>(
    new Map(),
  );

  useEffect(() => {
    const active = new Map<string, { color: string; type: FrameOverlayType }>();

    for (const agent of agents) {
      if (
        agent.status === "working" &&
        agent.activeFrameId &&
        agent.activeOverlay
      ) {
        active.set(agent.activeFrameId, {
          color: agent.color,
          type: agent.activeOverlay,
        });
      }
    }

    if (
      mainChatStatus === "working" &&
      mainChatActiveFrameId &&
      mainChatActiveOverlay
    ) {
      active.set(mainChatActiveFrameId, {
        color: SINGLE_AGENT_COLOR,
        type: mainChatActiveOverlay,
      });
    }

    setOverlays((prev) => {
      const next = new Map(prev);
      let changed = false;

      for (const [fid, info] of active) {
        const existing = next.get(fid);
        if (!existing) {
          const frame = frames.find((f) => f.id === fid);
          if (!frame) continue;
          next.set(fid, {
            left: frame.left,
            top: frame.top,
            width: frame.width ?? FRAME_WIDTH,
            height: frame.height ?? FRAME_HEIGHT,
            color: info.color,
            label: frame.label || "screen",
            type: info.type,
            fadingOut: false,
          });
          changed = true;
        } else if (existing.fadingOut) {
          next.set(fid, { ...existing, fadingOut: false, type: info.type });
          changed = true;
        } else if (existing.type !== info.type) {
          next.set(fid, { ...existing, type: info.type });
          changed = true;
        }
      }

      for (const [fid, entry] of next) {
        if (!active.has(fid) && !entry.fadingOut) {
          next.set(fid, { ...entry, fadingOut: true });
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [
    agents,
    frames,
    mainChatActiveFrameId,
    mainChatActiveOverlay,
    mainChatStatus,
  ]);

  const handleFadeComplete = useCallback((frameId: string) => {
    setOverlays((prev) => {
      const next = new Map(prev);
      next.delete(frameId);
      return next;
    });
  }, []);

  useEffect(() => {
    const scanTimers: ReturnType<typeof setTimeout>[] = [];
    for (const [fid, entry] of overlays) {
      if (entry.type === "scan" && !entry.fadingOut) {
        const timer = setTimeout(() => {
          setOverlays((prev) => {
            const existing = prev.get(fid);
            if (!existing || existing.type !== "scan" || existing.fadingOut)
              return prev;
            const next = new Map(prev);
            next.set(fid, { ...existing, fadingOut: true });
            return next;
          });
        }, SCAN_DURATION_MS);
        scanTimers.push(timer);
      }
    }
    return () => scanTimers.forEach(clearTimeout);
  }, [overlays]);

  if (overlays.size === 0) return null;

  return (
    <>
      {Array.from(overlays.entries()).map(([fid, entry]) => (
        <div
          key={fid}
          style={{
            opacity: entry.fadingOut ? 0 : 1,
            transition: `opacity ${FADE_OUT_MS}ms ease-out`,
          }}
          onTransitionEnd={() => {
            if (entry.fadingOut) handleFadeComplete(fid);
          }}
        >
          {entry.type === "scan" ? (
            <ScanOverlay
              left={entry.left}
              top={entry.top}
              width={entry.width}
              height={entry.height}
              color={entry.color}
            />
          ) : entry.type === "design" ? (
            <DesignOverlay
              left={entry.left}
              top={entry.top}
              width={entry.width}
              height={entry.height}
              label={entry.label}
            />
          ) : null}
        </div>
      ))}
    </>
  );
}
