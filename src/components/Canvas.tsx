"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { SelectionToast } from "@/components/custom-toast/selection-toast";
import { Frame } from "@/components/Frame";
import { FramePreview } from "@/components/FramePreview";
import { useCanvas } from "@/hooks/useCanvas";
import {
  convertClientPointToContentPoint,
  getFramesIntersectingRectangle,
  FRAME_WIDTH,
  FRAME_HEIGHT,
} from "@/lib/canvas-utils";

export function Canvas() {
  const {
    transform,
    frames,
    selectedFrameIds,
    updateCanvasTransform,
    setSelectedFrameIds,
    toggleFrameSelectionState,
    updateFrameProperties,
    removeFrameFromCanvas,
    duplicateFrameById,
    zoomCanvasAtCursorPosition,
  } = useCanvas();

  const panStart = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
  } | null>(null);
  const marqueeStart = useRef<{ contentX: number; contentY: number } | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedFrameIdsRef = useRef<string[]>(selectedFrameIds);
  selectedFrameIdsRef.current = selectedFrameIds;
  const [isPanning, setIsPanning] = useState(false);
  const [isMarquee, setIsMarquee] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const zoomEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(
    null,
  );

  const { x, y, scale } = transform;

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
    [x, y, scale],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
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

      if (spaceHeld) {
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
    [transform.x, transform.y, x, y, scale, setSelectedFrameIds, spaceHeld],
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

  useEffect(() => {
    const count = selectedFrameIds.length;
    if (count === 0) {
      toast.dismiss("selection");
    } else {
      const label =
        count === 1 ? "1 screen selected" : `${count} screens selected`;
      toast.custom(
        () => (
          <SelectionToast
            message={label}
            onCopy={() => {
              if (selectedFrameIds[0]) duplicateFrameById(selectedFrameIds[0]);
            }}
            onDelete={() => {
              selectedFrameIds.forEach((id) => removeFrameFromCanvas(id));
              toast.dismiss("selection");
            }}
          />
        ),
        {
          id: "selection",
          duration: Infinity,
          position: "bottom-center",
          closeButton: false,
        },
      );
    }
  }, [selectedFrameIds, duplicateFrameById, removeFrameFromCanvas]);

  const zoomPendingRef = useRef<{
    containerX: number;
    containerY: number;
    deltaY: number;
  } | null>(null);
  const zoomRafRef = useRef<number | null>(null);

  const flushZoom = useCallback(() => {
    const p = zoomPendingRef.current;
    if (!p) return;
    zoomPendingRef.current = null;
    zoomRafRef.current = null;
    zoomCanvasAtCursorPosition(p.containerX, p.containerY, p.deltaY);
  }, [zoomCanvasAtCursorPosition]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const containerX = e.clientX - rect.left;
      const containerY = e.clientY - rect.top;
      const isZoom = e.ctrlKey || e.metaKey;
      if (isZoom) {
        setIsZooming(true);
        if (zoomEndTimeoutRef.current) clearTimeout(zoomEndTimeoutRef.current);
        zoomEndTimeoutRef.current = setTimeout(() => {
          zoomEndTimeoutRef.current = null;
          setIsZooming(false);
        }, 150);
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
    [zoomCanvasAtCursorPosition, updateCanvasTransform, x, y, scale, flushZoom],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  useEffect(
    () => () => {
      if (zoomEndTimeoutRef.current) clearTimeout(zoomEndTimeoutRef.current);
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      className="relative size-full contain-layout contain-paint overflow-hidden"
      style={{
        backgroundColor: "#1d1716",
        backgroundImage:
          "radial-gradient(circle, #48403f 1px, transparent 1px)",
        backgroundSize: "20px 20px",
        cursor: isPanning
          ? "grabbing"
          : isMarquee
            ? "crosshair"
            : spaceHeld
              ? "grab"
              : "default",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      role="application"
      aria-label="Canvas"
    >
      <div
        className={`absolute origin-top-left will-change-transform ${!isPanning && !isZooming ? "transition-transform duration-150 ease-out" : ""}`}
        style={{
          transform: `translate(${x}px, ${y}px) scale(${scale})`,
        }}
      >
        {marqueeStart.current && marqueeEnd && (
          <div
            className="pointer-events-none absolute z-50 border-4 border-[#8A87F8] bg-[#8A87F8]/10"
            style={{
              left: Math.min(marqueeStart.current.contentX, marqueeEnd.x),
              top: Math.min(marqueeStart.current.contentY, marqueeEnd.y),
              width: Math.abs(marqueeEnd.x - marqueeStart.current.contentX),
              height: Math.abs(marqueeEnd.y - marqueeStart.current.contentY),
            }}
          />
        )}
        {frames.map((frame) => (
          <Frame
            key={frame.id}
            id={frame.id}
            label={frame.label}
            left={frame.left}
            top={frame.top}
            selected={selectedFrameIds.includes(frame.id)}
            onSelect={handleFrameSelect}
            showToolbar={
              selectedFrameIds.includes(frame.id) &&
              selectedFrameIds.length === 1
            }
            canvasScale={scale}
            onPositionChange={(newLeft, newTop) =>
              updateFrameProperties(frame.id, { left: newLeft, top: newTop })
            }
            spaceHeld={spaceHeld}
          >
            <FramePreview html={frame.html} />
          </Frame>
        ))}
      </div>
    </div>
  );
}
