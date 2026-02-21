"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { FRAME_WIDTH, FRAME_HEIGHT } from "@/lib/canvas-utils";

export type ResizeHandle = "nw" | "ne" | "sw" | "se";

export const MIN_FRAME_WIDTH = 120;
export const MIN_FRAME_HEIGHT = 250;

export interface UseFrameInteractionProps {
  frameRef: React.RefObject<HTMLDivElement | null>;
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  canvasScale?: number;
  spaceHeld?: boolean;
  onSelect?: (id: string, metaKey: boolean) => void;
  onPositionChange?: (newLeft: number, newTop: number) => void;
  onSizeChange?: (changes: {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
  }) => void;
  onWheelForZoom?: (e: {
    clientX: number;
    clientY: number;
    deltaY: number;
  }) => void;
}

export function useFrameInteraction({
  frameRef,
  id,
  left,
  top,
  width,
  height,
  canvasScale = 0.556382,
  spaceHeld = false,
  onSelect,
  onPositionChange,
  onSizeChange,
  onWheelForZoom,
}: UseFrameInteractionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [zoomModifierHeld, setZoomModifierHeld] = useState(false);

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
  const wheelOverlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Meta") setZoomModifierHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Meta") setZoomModifierHeld(false);
    };
    const onBlur = () => setZoomModifierHeld(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // Capture-phase listener on frame: intercepts zoom (ctrl+wheel, trackpad pinch)
  // before events reach container. Overlay alone fails for trackpad (no keydown).
  useEffect(() => {
    if (!onWheelForZoom || !frameRef.current) return;
    const el = frameRef.current;
    const handleWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      e.stopPropagation();
      onWheelForZoom({
        clientX: e.clientX,
        clientY: e.clientY,
        deltaY: e.deltaY,
      });
    };
    el.addEventListener("wheel", handleWheel, {
      passive: false,
      capture: true,
    });
    return () =>
      el.removeEventListener("wheel", handleWheel, { capture: true });
  }, [onWheelForZoom, frameRef]);

  const handleContentPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      onSelect?.(id, e.metaKey);
    },
    [onSelect, id],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      if (spaceHeld) return;
      if ((e.target as Element).closest?.("[data-toolbar-buttons]")) {
        e.stopPropagation();
        return;
      }
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
          left: l,
          top: t,
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
        let newLeft = l;
        let newTop = t;
        if (corner === "sw" || corner === "nw") {
          newLeft = l + (w - newWidth);
        }
        if (corner === "ne" || corner === "nw") {
          newTop = t + (h - newHeight);
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

  return {
    isDragging,
    zoomModifierHeld,
    wheelOverlayRef,
    uniformScale,
    handleContentPointerDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleResizePointerDown,
  };
}
