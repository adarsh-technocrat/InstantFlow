"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { SelectionToast } from "@/components/custom-toast/selection-toast";
import { Frame } from "@/components/Frame";
import { useCanvas } from "@/hooks/useCanvas";

const FRAME_WIDTH = 430;
const FRAME_HEIGHT = 1120;

function clientToContent(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  tx: number,
  ty: number,
  scale: number,
) {
  return {
    x: (clientX - containerRect.left - tx) / scale,
    y: (clientY - containerRect.top - ty) / scale,
  };
}

function framesInRect(
  frames: { id: string; left: number; top: number }[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);
  return frames.filter((f) => {
    const fRight = f.left + FRAME_WIDTH;
    const fBottom = f.top + FRAME_HEIGHT;
    return !(
      right < f.left ||
      left > fRight ||
      bottom < f.top ||
      top > fBottom
    );
  });
}

export function Canvas() {
  const {
    transform,
    frames,
    selectedFrameIds,
    setTransform,
    setSelectedFrames,
    toggleFrameInSelection,
    updateFrame,
    removeFrame,
    duplicateFrame,
    zoomAtPoint,
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
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(
    null,
  );

  const { x, y, scale } = transform;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
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
      return clientToContent(e.clientX, e.clientY, rect, x, y, scale);
    },
    [x, y, scale],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const content = clientToContent(e.clientX, e.clientY, rect, x, y, scale);

      if (spaceHeld) {
        setSelectedFrames([]);
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
    [transform.x, transform.y, x, y, scale, setSelectedFrames, spaceHeld],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (panStart.current) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        setTransform({
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
    [setTransform, getContentCoords],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      if (marqueeStart.current && marqueeEnd) {
        const ids = framesInRect(
          frames,
          marqueeStart.current.contentX,
          marqueeStart.current.contentY,
          marqueeEnd.x,
          marqueeEnd.y,
        ).map((f) => f.id);
        setSelectedFrames(ids);
        marqueeStart.current = null;
        setMarqueeEnd(null);
        setIsMarquee(false);
      }
      panStart.current = null;
      setIsPanning(false);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    },
    [frames, marqueeEnd, setSelectedFrames],
  );

  const handleFrameSelect = useCallback(
    (id: string, metaKey: boolean) => {
      if (metaKey) {
        toggleFrameInSelection(id);
      } else {
        setSelectedFrames([id]);
      }
    },
    [setSelectedFrames, toggleFrameInSelection],
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
              if (selectedFrameIds[0]) duplicateFrame(selectedFrameIds[0]);
            }}
            onDelete={() => {
              selectedFrameIds.forEach((id) => removeFrame(id));
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
  }, [selectedFrameIds, duplicateFrame, removeFrame]);

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
        zoomAtPoint(containerX, containerY, e.deltaY);
      } else {
        setTransform({
          x: x - e.deltaX,
          y: y - e.deltaY,
        });
      }
    },
    [zoomAtPoint, setTransform, x, y],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  return (
    <div
      ref={containerRef}
      className="relative size-full contain-layout contain-paint overflow-hidden bg-(--background-secondary) dark:bg-(--background-secondary)"
      style={{
        backgroundImage:
          "radial-gradient(circle, var(--border) 1px, transparent 1px)",
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
        className={`absolute origin-top-left ${!isPanning ? "transition-transform duration-150 ease-out" : ""}`}
        style={{
          transform: `translate(${x}px, ${y}px) scale(${scale})`,
        }}
      >
        {marqueeStart.current && marqueeEnd && (
          <div
            className="pointer-events-none absolute z-50 border-2 border-[#48413f] bg-[#48413f]/10"
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
              updateFrame(frame.id, { left: newLeft, top: newTop })
            }
          />
        ))}
      </div>
    </div>
  );
}
