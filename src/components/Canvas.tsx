"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Frame } from "@/components/Frame";
import { useCanvas } from "@/hooks/useCanvas";

export function Canvas() {
  const { transform, frames, setTransform, zoomAtPoint } = useCanvas();

  const panStart = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      setIsPanning(true);
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        tx: transform.x,
        ty: transform.y,
      };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [transform.x, transform.y],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!panStart.current) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setTransform({
        x: panStart.current.tx + dx,
        y: panStart.current.ty + dy,
      });
    },
    [setTransform],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    panStart.current = null;
    setIsPanning(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, []);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const containerX = e.clientX - rect.left;
      const containerY = e.clientY - rect.top;
      zoomAtPoint(containerX, containerY, e.deltaY);
    },
    [zoomAtPoint],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const { x, y, scale } = transform;

  return (
    <div
      ref={containerRef}
      className="relative size-full contain-layout contain-paint cursor-grab overflow-hidden bg-(--background-secondary) dark:bg-(--background-secondary) active:cursor-grabbing"
      style={{
        backgroundImage:
          "radial-gradient(circle, var(--border) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
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
        {frames.map((frame) => (
          <Frame
            key={frame.id}
            label={frame.label}
            left={frame.left}
            top={frame.top}
          />
        ))}
      </div>
    </div>
  );
}
