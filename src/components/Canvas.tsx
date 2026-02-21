"use client";

import { useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { SelectionToast } from "@/components/custom-toast/selection-toast";
import { Frame } from "@/components/Frame";
import { FramePreview } from "@/components/FramePreview";
import { useCanvas } from "@/hooks/useCanvas";
import { useCanvasInteraction } from "@/hooks/useCanvasInteraction";
import { useAppSelector } from "@/store/hooks";

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
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

  const persistFramePosition = useCallback(
    (
      frameId: string,
      label?: string,
      left?: number,
      top?: number,
      html?: string,
    ) => {
      const frame = frames.find((f) => f.id === frameId);
      if (!frame) return;
      fetch("/api/frames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameId: frame.id,
          html: html ?? frame.html,
          label: label ?? frame.label,
          left: left ?? frame.left,
          top: top ?? frame.top,
        }),
      }).catch(() => {});
    },
    [frames],
  );

  const handlePositionChange = useCallback(
    (id: string, newLeft: number, newTop: number) => {
      updateFrameProperties(id, { left: newLeft, top: newTop });
      persistFramePosition(id, undefined, newLeft, newTop);
    },
    [updateFrameProperties, persistFramePosition],
  );

  const canvasToolMode = useAppSelector((s) => s.ui.canvasToolMode);
  const {
    isPanning,
    isMarquee,
    isZooming,
    spaceHeld,
    marqueeStartRef,
    marqueeEnd,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleFrameSelect,
    handleWheelFromFrame,
  } = useCanvasInteraction({
    containerRef,
    transform,
    frames,
    selectedFrameIds,
    updateCanvasTransform,
    setSelectedFrameIds,
    toggleFrameSelectionState,
    zoomCanvasAtCursorPosition,
    canvasToolMode,
  });

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

  const { x, y, scale } = transform;

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
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      tabIndex={0}
      role="application"
      aria-label="Canvas"
    >
      <div
        className={`absolute left-0 top-0 origin-top-left will-change-transform ${!isPanning && !isZooming ? "transition-transform duration-150 ease-out" : ""}`}
        style={{
          transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) scale(${scale})`,
          backfaceVisibility: "hidden" as const,
        }}
      >
        {marqueeStartRef.current && marqueeEnd && (
          <div
            className="pointer-events-none absolute z-50 border-4 border-[#8A87F8] bg-[#8A87F8]/10"
            style={{
              left: Math.min(marqueeStartRef.current.contentX, marqueeEnd.x),
              top: Math.min(marqueeStartRef.current.contentY, marqueeEnd.y),
              width: Math.abs(marqueeEnd.x - marqueeStartRef.current.contentX),
              height: Math.abs(marqueeEnd.y - marqueeStartRef.current.contentY),
            }}
          />
        )}
        {frames.map((frame) => (
          <Frame
            key={frame.id}
            id={frame.id}
            label={frame.label}
            html={frame.html}
            left={frame.left}
            top={frame.top}
            width={frame.width}
            height={frame.height}
            selected={selectedFrameIds.includes(frame.id)}
            onSelect={handleFrameSelect}
            showToolbar={
              selectedFrameIds.includes(frame.id) &&
              selectedFrameIds.length === 1
            }
            canvasScale={scale}
            onPositionChange={(newLeft, newTop) =>
              handlePositionChange(frame.id, newLeft, newTop)
            }
            onSizeChange={(changes) => updateFrameProperties(frame.id, changes)}
            spaceHeld={spaceHeld}
            onWheelForZoom={
              selectedFrameIds.includes(frame.id) &&
              selectedFrameIds.length === 1
                ? handleWheelFromFrame
                : undefined
            }
          >
            <FramePreview
              frameId={frame.id}
              html={frame.html}
              label={frame.label}
              left={frame.left}
              top={frame.top}
              allowInteraction={
                selectedFrameIds.includes(frame.id) &&
                selectedFrameIds.length === 1
              }
            />
          </Frame>
        ))}
      </div>
    </div>
  );
}
