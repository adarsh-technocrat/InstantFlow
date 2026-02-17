"use client";

import { useState, useRef, useCallback } from "react";
import { FrameToolbar } from "@/components/FrameToolbar";

export const PHONE_CLIP_PATH =
  'path("M 334 0 c 45.255 0 67.882 0 81.941 14.059 c 14.059 14.059 14.059 36.686 14.059 81.941 L 430 1024 c 0 45.255 0 67.882 -14.059 81.941 c -14.059 14.059 -36.686 14.059 -81.941 14.059 L 96 1120 c -45.255 0 -67.882 0 -81.941 -14.059 c -14.059 -14.059 -14.059 -36.686 -14.059 -81.941 L 0 96 c 0 -45.255 0 -67.882 14.059 -81.941 c 14.059 -14.059 36.686 -14.059 81.941 -14.059 Z")';

const FRAME_WIDTH = 430;
const FRAME_HEIGHT = 1120;

function DragHandleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 256 256"
      className="size-4 shrink-0"
    >
      <path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60,12a12,12,0,1,0-12-12A12,12,0,0,0,164,72ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z" />
    </svg>
  );
}

export interface FrameProps {
  id: string;
  /** Display label above the frame (e.g. screen name) */
  label: string;
  /** Horizontal position in px (relative to canvas transform origin) */
  left: number;
  /** Vertical position in px (default: -500) */
  top?: number;
  /** Whether this frame is selected */
  selected?: boolean;
  /** Called when frame is clicked. (id, metaKey): if metaKey toggle in selection, else set selection to [id]. */
  onSelect?: (id: string, metaKey: boolean) => void;
  /** Show toolbar (only when single selection). Defaults to selected */
  showToolbar?: boolean;
  /** Canvas scale for toolbar sizing */
  canvasScale?: number;
  /** Called when frame is dragged to a new position (canvas coordinates) */
  onPositionChange?: (newLeft: number, newTop: number) => void;
  /** Optional content to render inside the phone screen. Defaults to a placeholder. */
  children?: React.ReactNode;
}

export function Frame({
  id,
  label,
  left,
  top = -500,
  selected = false,
  onSelect,
  showToolbar: showToolbarProp = undefined,
  canvasScale = 0.556382,
  onPositionChange,
  children,
}: FrameProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{
    clientX: number;
    clientY: number;
    left: number;
    top: number;
  } | null>(null);
  const showDottedBorder = isHovered || selected;
  const showToolbar = showToolbarProp ?? selected;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      onSelect?.(id, e.metaKey);
      dragStart.current = { clientX: e.clientX, clientY: e.clientY, left, top };
      setIsDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [onSelect, id, left, top],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStart.current || !onPositionChange) return;
      const scale = canvasScale || 0.556382;
      const dx = (e.clientX - dragStart.current.clientX) / scale;
      const dy = (e.clientY - dragStart.current.clientY) / scale;
      onPositionChange(dragStart.current.left + dx, dragStart.current.top + dy);
    },
    [canvasScale, onPositionChange],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragStart.current = null;
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const handlePointerEnter = useCallback(() => setIsHovered(true), []);
  const handlePointerLeave = useCallback(() => setIsHovered(false), []);

  return (
    <div
      className={`absolute ${isDragging ? "cursor-grabbing" : ""}`}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerUp}
    >
      {showDottedBorder && (
        <div
          className="pointer-events-none absolute -inset-3 z-30 rounded-none border-2 border-dotted border-(--frame-border)"
          aria-hidden
        />
      )}

      <div className="absolute isolate size-full filter-[drop-shadow(0_0_2px_rgb(212_212_216))] dark:filter-[drop-shadow(0_0_2px_rgb(113_113_122))]">
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            backgroundColor: "#0d0807",
            transform: "translateZ(0px)",
            backfaceVisibility: "hidden",
            clipPath: PHONE_CLIP_PATH,
          }}
        >
          {children ?? <div className="size-full" title="Canvas Frame" />}
        </div>
      </div>
      {selected && (
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden bg-primary/15"
          style={{ clipPath: PHONE_CLIP_PATH }}
          aria-hidden
        />
      )}
      <div className="pointer-events-none absolute inset-0 z-40" />

      {showToolbar && (
        <FrameToolbar
          label={label}
          scale={1 / canvasScale}
          canvasScale={canvasScale}
        />
      )}

      <div
        className="absolute left-0 flex items-center gap-3 truncate whitespace-nowrap text-sm"
        style={{
          transform: "scale(1.79733)",
          top: showToolbar ? "-53.9198px" : "-53.9198px",
          transformOrigin: "left top",
          visibility: showToolbar ? "hidden" : "visible",
        }}
      >
        <div
          className="flex cursor-grab items-center gap-1 truncate"
          style={{ width: 239.244 }}
        >
          <DragHandleIcon />
          <div className="min-w-18 flex flex-1 flex-col gap-2 truncate">
            <div
              className="relative inline-block min-w-0 cursor-default select-none truncate rounded border border-transparent py-0 text-sm hover:text-(--foreground-muted)"
              role="button"
              tabIndex={0}
            >
              {label}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
