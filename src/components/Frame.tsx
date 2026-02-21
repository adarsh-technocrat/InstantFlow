"use client";

import { useRef } from "react";
import { FrameToolbar } from "@/components/FrameToolbar";
import {
  useFrameInteraction,
  type ResizeHandle,
  MIN_FRAME_WIDTH,
  MIN_FRAME_HEIGHT,
} from "@/hooks/useFrameInteraction";
import { FRAME_WIDTH, FRAME_HEIGHT } from "@/lib/canvas-utils";

const PHONE_PATH_D =
  "M 334 0 c 45.255 0 67.882 0 81.941 14.059 c 14.059 14.059 14.059 36.686 14.059 81.941 L 430 836 c 0 45.255 0 67.882 -14.059 81.941 c -14.059 14.059 -36.686 14.059 -81.941 14.059 L 96 932 c -45.255 0 -67.882 0 -81.941 -14.059 c -14.059 -14.059 -14.059 -36.686 -14.059 -81.941 L 0 96 c 0 -45.255 0 -67.882 14.059 -81.941 c 14.059 -14.059 36.686 -14.059 81.941 -14.059 Z";

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

function ResizeHandleEdge({
  edge,
  onPointerDown,
}: {
  edge: "n" | "s" | "e" | "w";
  onPointerDown: (e: React.PointerEvent, edge: ResizeHandle) => void;
}) {
  const cursor = edge === "n" || edge === "s" ? "ns-resize" : "ew-resize";
  const position =
    edge === "n"
      ? "left-0 right-0 top-0 -translate-y-1/2"
      : edge === "s"
        ? "left-0 right-0 bottom-0 translate-y-1/2"
        : edge === "e"
          ? "right-0 top-0 bottom-0 translate-x-1/2"
          : "left-0 top-0 bottom-0 -translate-x-1/2";

  return (
    <div
      className={`absolute z-50 shrink-0 rounded-sm border-2 border-white bg-frame-hover-border shadow-md ${position} ${edge === "n" || edge === "s" ? "h-2" : "w-2"} min-w-2 min-h-2`}
      style={{ cursor }}
      data-resize-handle={edge}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown(e, edge);
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
  html?: string;
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
  onWheelForZoom?: (e: {
    clientX: number;
    clientY: number;
    deltaY: number;
  }) => void;
  children?: React.ReactNode;
}

export function Frame({
  id,
  label,
  html = "",
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
  onWheelForZoom,
  children,
}: FrameProps) {
  const width = widthProp ?? FRAME_WIDTH;
  const height = heightProp ?? FRAME_HEIGHT;
  const frameRef = useRef<HTMLDivElement>(null);
  const showToolbar = showToolbarProp ?? selected;

  const {
    isDragging,
    zoomModifierHeld,
    wheelOverlayRef,
    handleContentPointerDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleResizePointerDown,
  } = useFrameInteraction({
    frameRef,
    id,
    left,
    top,
    width,
    height,
    canvasScale,
    spaceHeld,
    onSelect,
    onPositionChange,
    onSizeChange,
    onWheelForZoom,
  });

  return (
    <div
      ref={frameRef}
      data-frame
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
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <clipPath
            id={`frame-phone-clip-${id}`}
            clipPathUnits="objectBoundingBox"
            transform={`scale(${1 / FRAME_WIDTH}, ${1 / FRAME_HEIGHT})`}
          >
            <path d={PHONE_PATH_D} />
          </clipPath>
        </defs>
      </svg>
      <div
        className="absolute inset-0 isolate will-change-transform filter-[drop-shadow(0_0_2px_rgb(212_212_216))] dark:filter-[drop-shadow(0_0_2px_rgb(113_113_122))]"
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        <div
          className="absolute inset-0 overflow-hidden will-change-transform"
          style={{
            backgroundColor: "#0d0807",
            transform: "translateZ(0px)",
            backfaceVisibility: "hidden",
            clipPath: `url(#frame-phone-clip-${id})`,
          }}
          {...(onWheelForZoom && { "data-frame-zoom": "true" })}
          onPointerDown={handleContentPointerDown}
        >
          {children ?? <div className="size-full" title="Canvas Frame" />}
          {onWheelForZoom && (
            <div
              ref={wheelOverlayRef}
              className="absolute inset-0 z-50"
              style={{
                pointerEvents: zoomModifierHeld ? "auto" : "none",
              }}
              aria-hidden
            />
          )}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 z-40" />

      {showToolbar && (
        <>
          {!isDragging && (
            <div
              className="pointer-events-none absolute inset-0 z-30 rounded-none border-2 border-frame-hover-border"
              aria-hidden
            />
          )}
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
          <ResizeHandleEdge edge="n" onPointerDown={handleResizePointerDown} />
          <ResizeHandleEdge edge="s" onPointerDown={handleResizePointerDown} />
          <ResizeHandleEdge edge="e" onPointerDown={handleResizePointerDown} />
          <ResizeHandleEdge edge="w" onPointerDown={handleResizePointerDown} />
          <FrameToolbar
            label={label}
            html={html}
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
          <span data-drag-handle className="cursor-grab">
            <DragHandleIcon />
          </span>
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
