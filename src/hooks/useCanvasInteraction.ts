"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  convertClientPointToContentPoint,
  getFramesIntersectingRectangle,
  FRAME_WIDTH,
  FRAME_HEIGHT,
} from "@/lib/canvas-utils";
import type { CanvasTransform } from "@/store/slices/canvasSlice";
import type { CanvasToolMode } from "@/store/slices/uiSlice";

const ZOOM_SETTLE_MS = 250;

export interface UseCanvasInteractionProps {
  canvasToolMode?: CanvasToolMode;
  containerRef: React.RefObject<HTMLDivElement | null>;
  transform: CanvasTransform;
  frames: {
    id: string;
    left: number;
    top: number;
    width?: number;
    height?: number;
  }[];
  selectedFrameIds: string[];
  updateCanvasTransform: (payload: Partial<CanvasTransform>) => void;
  setSelectedFrameIds: (ids: string[]) => void;
  toggleFrameSelectionState: (id: string) => void;
  zoomCanvasAtCursorPosition: (
    containerX: number,
    containerY: number,
    deltaY: number,
  ) => void;
}

export function useCanvasInteraction({
  containerRef,
  transform,
  frames,
  selectedFrameIds,
  updateCanvasTransform,
  setSelectedFrameIds,
  toggleFrameSelectionState,
  zoomCanvasAtCursorPosition,
  canvasToolMode = "select",
}: UseCanvasInteractionProps) {
  const { x, y, scale } = transform;
  const panStart = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
  } | null>(null);
  const marqueeStart = useRef<{ contentX: number; contentY: number } | null>(
    null,
  );
  const zoomPendingRef = useRef<{
    containerX: number;
    containerY: number;
    deltaY: number;
  } | null>(null);
  const zoomRafRef = useRef<number | null>(null);
  const zoomEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [isMarquee, setIsMarquee] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(
    null,
  );

  const flushZoom = useCallback(() => {
    const p = zoomPendingRef.current;
    if (!p) return;
    zoomPendingRef.current = null;
    zoomRafRef.current = null;
    zoomCanvasAtCursorPosition(p.containerX, p.containerY, p.deltaY);
  }, [zoomCanvasAtCursorPosition]);

  const getContentCoords = useCallback(
    (e: React.PointerEvent) => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return convertClientPointToContentPoint(
        e.clientX,
        e.clientY,
        rect,
        x,
        y,
        scale,
      );
    },
    [containerRef, x, y, scale],
  );

  const scheduleZoomEnd = useCallback(() => {
    setIsZooming(true);
    if (zoomEndTimeoutRef.current) clearTimeout(zoomEndTimeoutRef.current);
    zoomEndTimeoutRef.current = setTimeout(() => {
      zoomEndTimeoutRef.current = null;
      setIsZooming(false);
    }, ZOOM_SETTLE_MS);
  }, []);

  const handleWheelFromFrame = useCallback(
    (e: { clientX: number; clientY: number; deltaY: number }) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const containerX = e.clientX - rect.left;
      const containerY = e.clientY - rect.top;
      scheduleZoomEnd();
      const prev = zoomPendingRef.current;
      const accumulated = (prev?.deltaY ?? 0) + e.deltaY;
      zoomPendingRef.current = {
        containerX,
        containerY,
        deltaY: accumulated,
      };
      if (zoomRafRef.current === null) {
        zoomRafRef.current = requestAnimationFrame(flushZoom);
      }
    },
    [containerRef, flushZoom, scheduleZoomEnd],
  );

  useEffect(() => {
    const isEditableElement = (el: EventTarget | null) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return true;
      return el.isContentEditable ?? false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isEditableElement(e.target)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        if (!isEditableElement(e.target)) e.preventDefault();
        setSpaceHeld(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const effectiveSpaceHeld = spaceHeld || canvasToolMode === "hand";

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      if (
        (e.target as Element).closest?.("[data-frame]") &&
        !effectiveSpaceHeld
      )
        return;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const content = convertClientPointToContentPoint(
        e.clientX,
        e.clientY,
        rect,
        x,
        y,
        scale,
      );

      if (effectiveSpaceHeld) {
        setSelectedFrameIds([]);
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          tx: transform.x,
          ty: transform.y,
        };
        setIsPanning(true);
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      } else {
        marqueeStart.current = { contentX: content.x, contentY: content.y };
        setMarqueeEnd({ x: content.x, y: content.y });
        setIsMarquee(true);
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }
    },
    [
      transform.x,
      transform.y,
      x,
      y,
      scale,
      setSelectedFrameIds,
      effectiveSpaceHeld,
    ],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (panStart.current) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        updateCanvasTransform({
          x: panStart.current.tx + dx,
          y: panStart.current.ty + dy,
        });
        return;
      }
      if (marqueeStart.current) {
        const content = getContentCoords(e);
        if (content) setMarqueeEnd({ x: content.x, y: content.y });
      }
    },
    [updateCanvasTransform, getContentCoords],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      if (marqueeStart.current && marqueeEnd) {
        const ids = getFramesIntersectingRectangle(
          frames,
          marqueeStart.current.contentX,
          marqueeStart.current.contentY,
          marqueeEnd.x,
          marqueeEnd.y,
          FRAME_WIDTH,
          FRAME_HEIGHT,
        ).map((f) => f.id);
        setSelectedFrameIds(ids);
        marqueeStart.current = null;
        setMarqueeEnd(null);
        setIsMarquee(false);
      }
      panStart.current = null;
      setIsPanning(false);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    },
    [frames, marqueeEnd, setSelectedFrameIds],
  );

  const handleFrameSelect = useCallback(
    (id: string, metaKey: boolean) => {
      if (metaKey) {
        toggleFrameSelectionState(id);
      } else {
        setSelectedFrameIds([id]);
      }
    },
    [setSelectedFrameIds, toggleFrameSelectionState],
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const containerX = e.clientX - rect.left;
      const containerY = e.clientY - rect.top;
      const isZoom = e.ctrlKey || e.metaKey;
      // When zooming over selected frame, route to frame handler (avoids browser zoom + correct behavior)
      if (isZoom && (e.target as Element).closest?.("[data-frame-zoom]")) {
        handleWheelFromFrame({
          clientX: e.clientX,
          clientY: e.clientY,
          deltaY: e.deltaY,
        });
        return;
      }
      if (isZoom) {
        scheduleZoomEnd();
        const prev = zoomPendingRef.current;
        zoomPendingRef.current = {
          containerX,
          containerY,
          deltaY: (prev?.deltaY ?? 0) + e.deltaY,
        };
        if (zoomRafRef.current === null) {
          zoomRafRef.current = requestAnimationFrame(flushZoom);
        }
      } else {
        updateCanvasTransform({
          x: x - e.deltaX,
          y: y - e.deltaY,
        });
      }
    },
    [
      containerRef,
      x,
      y,
      updateCanvasTransform,
      flushZoom,
      scheduleZoomEnd,
      handleWheelFromFrame,
    ],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    const preventBrowserZoomKeys = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const zoomKeys = ["=", "+", "-", "0"];
      if (!zoomKeys.includes(e.key)) return;
      const el = containerRef.current;
      if (!el) return;
      const target = e.target as Node | null;
      if (target && el.contains(target)) e.preventDefault();
    };
    document.addEventListener("keydown", preventBrowserZoomKeys, {
      capture: true,
    });
    return () =>
      document.removeEventListener("keydown", preventBrowserZoomKeys, {
        capture: true,
      });
  }, [containerRef]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== "canvas-zoom") return;
      if (e.origin !== window.location.origin) return;
      const deltaY = Number(e.data.deltaY);
      if (!Number.isFinite(deltaY)) return;
      handleWheelFromFrame({
        clientX: e.data.clientX,
        clientY: e.data.clientY,
        deltaY,
      });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handleWheelFromFrame]);

  useEffect(
    () => () => {
      if (zoomEndTimeoutRef.current) clearTimeout(zoomEndTimeoutRef.current);
    },
    [],
  );

  return {
    isPanning,
    isMarquee,
    isZooming,
    spaceHeld: effectiveSpaceHeld,
    marqueeStartRef: marqueeStart,
    marqueeEnd,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleFrameSelect,
    handleWheelFromFrame,
  };
}
