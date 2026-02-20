"use client";

import { useState, useRef, useCallback } from "react";
import { FrameToolbar } from "@/components/FrameToolbar";
import { FRAME_WIDTH, FRAME_HEIGHT } from "@/lib/canvas-utils";

export const PHONE_CLIP_PATH =
  'path("M 334 0 c 45.255 0 67.882 0 81.941 14.059 c 14.059 14.059 14.059 36.686 14.059 81.941 L 430 836 c 0 45.255 0 67.882 -14.059 81.941 c -14.059 14.059 -36.686 14.059 -81.941 14.059 L 96 932 c -45.255 0 -67.882 0 -81.941 -14.059 c -14.059 -14.059 -14.059 -36.686 -14.059 -81.941 L 0 96 c 0 -45.255 0 -67.882 14.059 -81.941 c 14.059 -14.059 36.686 -14.059 81.941 -14.059 Z")';

const MIN_FRAME_WIDTH = 120;
const MIN_FRAME_HEIGHT = 250;

type ResizeHandle = "nw" | "ne" | "sw" | "se";

function ResizeHandleDot({
  corner,
  onPointerDown,
}: {
  corner: ResizeHandle;
  onPointerDown: (e: React.PointerEvent, corner: ResizeHandle) => void;
}) {
  const cursor =
    corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize";
  const position =
    corner === "nw"
      ? "left-0 top-0 -translate-x-1/2 -translate-y-1/2"
      : corner === "ne"
        ? "right-0 top-0 translate-x-1/2 -translate-y-1/2"
        : corner === "sw"
          ? "left-0 bottom-0 -translate-x-1/2 translate-y-1/2"
          : "right-0 bottom-0 translate-x-1/2 translate-y-1/2";

  return (
    <div
      className={`absolute z-50 size-2.5 shrink-0 rounded-sm border-2 border-white bg-frame-hover-border shadow-md ${position}`}
      style={{ cursor }}
      data-resize-handle={corner}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown(e, corner);
      }}
      aria-hidden
    />
  );
}

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
  label: string;
  left: number;
  top?: number;
  width?: number;
  height?: number;
  selected?: boolean;
  onSelect?: (id: string, metaKey: boolean) => void;
  showToolbar?: boolean;
  canvasScale?: number;
  onPositionChange?: (newLeft: number, newTop: number) => void;
  onSizeChange?: (changes: {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
  }) => void;
  spaceHeld?: boolean;
  children?: React.ReactNode;
}

export function Frame({
  id,
  label,
  left,
  top = -500,
  width: widthProp,
  height: heightProp,
  selected = false,
  onSelect,
  showToolbar: showToolbarProp = undefined,
  canvasScale = 0.556382,
  onPositionChange,
  onSizeChange,
  spaceHeld = false,
  children,
}: FrameProps) {
  const width = widthProp ?? FRAME_WIDTH;
  const height = heightProp ?? FRAME_HEIGHT;
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef<{
    clientX: number;
    clientY: number;
    left: number;
    top: number;
  } | null>(null);
  const resizeStart = useRef<{
    corner: ResizeHandle;
    clientX: number;
    clientY: number;
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const showToolbar = showToolbarProp ?? selected;

  /** Content area: select only, no drag. Lets iframe receive interaction when selected. */
  const handleContentPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      onSelect?.(id, e.metaKey);
    },
    [onSelect, id],
  );

  /** Chrome (label, etc.): select and allow drag. */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      if (spaceHeld) return;
      e.stopPropagation();
      onSelect?.(id, e.metaKey);
      dragStart.current = { clientX: e.clientX, clientY: e.clientY, left, top };
      setIsDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [onSelect, id, left, top, spaceHeld],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const scale = canvasScale || 0.556382;
      if (resizeStart.current && onSizeChange) {
        const {
          corner,
          clientX,
          clientY,
          left,
          top,
          width: w,
          height: h,
        } = resizeStart.current;
        const dx = (e.clientX - clientX) / scale;
        const dy = (e.clientY - clientY) / scale;
        let rawWidth: number;
        let rawHeight: number;
        if (corner === "se") {
          rawWidth = w + dx;
          rawHeight = h + dy;
        } else if (corner === "sw") {
          rawWidth = w - dx;
          rawHeight = h + dy;
        } else if (corner === "ne") {
          rawWidth = w + dx;
          rawHeight = h - dy;
        } else {
          rawWidth = w - dx;
          rawHeight = h - dy;
        }
        const scaleX = Math.max(
          MIN_FRAME_WIDTH / FRAME_WIDTH,
          rawWidth / FRAME_WIDTH,
        );
        const scaleY = Math.max(
          MIN_FRAME_HEIGHT / FRAME_HEIGHT,
          rawHeight / FRAME_HEIGHT,
        );
        const uniformScale = Math.min(scaleX, scaleY);
        const newWidth = uniformScale * FRAME_WIDTH;
        const newHeight = uniformScale * FRAME_HEIGHT;
        let newLeft = left;
        let newTop = top;
        if (corner === "sw" || corner === "nw") {
          newLeft = left + (w - newWidth);
        }
        if (corner === "ne" || corner === "nw") {
          newTop = top + (h - newHeight);
        }
        onSizeChange({
          left: newLeft,
          top: newTop,
          width: newWidth,
          height: newHeight,
        });
        return;
      }
      if (dragStart.current && onPositionChange) {
        const dx = (e.clientX - dragStart.current.clientX) / scale;
        const dy = (e.clientY - dragStart.current.clientY) / scale;
        onPositionChange(
          dragStart.current.left + dx,
          dragStart.current.top + dy,
        );
      }
    },
    [canvasScale, onPositionChange, onSizeChange],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragStart.current = null;
    resizeStart.current = null;
    setIsDragging(false);
    setIsResizing(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const frameRef = useRef<HTMLDivElement>(null);

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, corner: ResizeHandle) => {
      if (e.button !== 0 || !onSizeChange) return;
      e.stopPropagation();
      resizeStart.current = {
        corner,
        clientX: e.clientX,
        clientY: e.clientY,
        left,
        top,
        width,
        height,
      };
      setIsResizing(true);
      frameRef.current?.setPointerCapture(e.pointerId);
    },
    [left, top, width, height, onSizeChange],
  );

  const uniformScale = Math.min(width / FRAME_WIDTH, height / FRAME_HEIGHT);

  return (
    <div
      ref={frameRef}
      className={`absolute shrink-0 ${isDragging ? "cursor-grabbing" : ""}`}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        minWidth: MIN_FRAME_WIDTH,
        minHeight: MIN_FRAME_HEIGHT,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="absolute inset-0 isolate will-change-transform filter-[drop-shadow(0_0_2px_rgb(212_212_216))] dark:filter-[drop-shadow(0_0_2px_rgb(113_113_122))]"
        style={{
          width: FRAME_WIDTH,
          height: FRAME_HEIGHT,
          transform: `scale(${uniformScale})`,
          transformOrigin: "top left",
        }}
      >
        <div
          className="absolute inset-0 overflow-hidden will-change-transform"
          style={{
            backgroundColor: "#0d0807",
            transform: "translateZ(0px)",
            backfaceVisibility: "hidden",
            clipPath: PHONE_CLIP_PATH,
          }}
          onPointerDown={handleContentPointerDown}
        >
          {children ?? <div className="size-full" title="Canvas Frame" />}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 z-40" />

      {showToolbar && (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-30 rounded-none border-2 border-frame-hover-border"
            aria-hidden
          />
          <ResizeHandleDot
            corner="nw"
            onPointerDown={handleResizePointerDown}
          />
          <ResizeHandleDot
            corner="ne"
            onPointerDown={handleResizePointerDown}
          />
          <ResizeHandleDot
            corner="sw"
            onPointerDown={handleResizePointerDown}
          />
          <ResizeHandleDot
            corner="se"
            onPointerDown={handleResizePointerDown}
          />
          <FrameToolbar
            label={label}
            scale={1 / canvasScale}
            canvasScale={canvasScale}
          />
        </>
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
