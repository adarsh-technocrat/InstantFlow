"use client";

import { useCallback } from "react";
import {
  setTransform,
  setZoom,
  setSelectedFrames,
  toggleFrameInSelection,
  addFrame,
  updateFrame,
  removeFrame,
  duplicateFrame,
  reorderFrames,
  updateFrameHtml,
  setTheme,
  type CanvasTransform,
  type FrameState,
} from "@/store/slices/canvasSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export const CANVAS_ZOOM = {
  MIN: 0.05, // 5%
  MAX: 8, // 800%
  STEP: 0.1,
  WHEEL_SENSITIVITY: 0.001,
  WHEEL_MAX_FACTOR: 0.92,
  WHEEL_MIN_FACTOR: 1.08,
} as const;

export function useCanvas() {
  const dispatch = useAppDispatch();
  const { transform, frames, selectedFrameIds, theme } = useAppSelector(
    (state) => state.canvas,
  );

  const updateCanvasTransform = useCallback(
    (payload: Partial<CanvasTransform>) => dispatch(setTransform(payload)),
    [dispatch],
  );

  const setCanvasZoomScale = useCallback(
    (scale: number) => dispatch(setZoom(scale)),
    [dispatch],
  );

  const increaseCanvasZoom = useCallback(() => {
    dispatch(
      setZoom(Math.min(CANVAS_ZOOM.MAX, transform.scale + CANVAS_ZOOM.STEP)),
    );
  }, [dispatch, transform.scale]);

  const decreaseCanvasZoom = useCallback(() => {
    dispatch(
      setZoom(Math.max(CANVAS_ZOOM.MIN, transform.scale - CANVAS_ZOOM.STEP)),
    );
  }, [dispatch, transform.scale]);

  /**
   * Zoom at cursor position with smooth proportional scaling from wheel delta.
   * @param containerX - cursor X relative to canvas container
   * @param containerY - cursor Y relative to canvas container
   * @param deltaY - wheel event deltaY (positive = zoom out, negative = zoom in)
   */
  const zoomCanvasAtCursorPosition = useCallback(
    (containerX: number, containerY: number, deltaY: number) => {
      const { x, y, scale } = transform;
      const factor = 1 - deltaY * CANVAS_ZOOM.WHEEL_SENSITIVITY;
      const clampedFactor = Math.max(
        CANVAS_ZOOM.WHEEL_MAX_FACTOR,
        Math.min(CANVAS_ZOOM.WHEEL_MIN_FACTOR, factor),
      );
      const newScale = Math.min(
        CANVAS_ZOOM.MAX,
        Math.max(CANVAS_ZOOM.MIN, scale * clampedFactor),
      );
      const contentX = (containerX - x) / scale;
      const contentY = (containerY - y) / scale;
      const newX = containerX - contentX * newScale;
      const newY = containerY - contentY * newScale;
      dispatch(setTransform({ x: newX, y: newY, scale: newScale }));
    },
    [dispatch, transform],
  );

  const addNewFrameToCanvas = useCallback(
    (payload: Omit<FrameState, "id">) => dispatch(addFrame(payload)),
    [dispatch],
  );

  const updateFrameProperties = useCallback(
    (id: string, changes: Partial<FrameState>) =>
      dispatch(updateFrame({ id, changes })),
    [dispatch],
  );

  const removeFrameFromCanvas = useCallback(
    (id: string) => dispatch(removeFrame(id)),
    [dispatch],
  );

  const reorderCanvasFrames = useCallback(
    (order: string[]) => dispatch(reorderFrames(order)),
    [dispatch],
  );

  const setSelectedFrameIds = useCallback(
    (ids: string[]) => dispatch(setSelectedFrames(ids)),
    [dispatch],
  );

  const toggleFrameSelectionState = useCallback(
    (id: string) => dispatch(toggleFrameInSelection(id)),
    [dispatch],
  );

  const updateFrameHtmlContent = useCallback(
    (id: string, html: string) => dispatch(updateFrameHtml({ id, html })),
    [dispatch],
  );

  const updateCanvasTheme = useCallback(
    (updates: Partial<Record<string, string>>) => dispatch(setTheme(updates)),
    [dispatch],
  );

  const zoomPercent = Math.round(transform.scale * 100);

  return {
    // State
    transform,
    frames,
    selectedFrameIds,
    theme,
    zoomPercent,

    // Selection
    setSelectedFrameIds,
    toggleFrameSelectionState,

    // Transform
    updateCanvasTransform,
    setCanvasZoomScale,
    increaseCanvasZoom,
    decreaseCanvasZoom,
    zoomCanvasAtCursorPosition,

    // Frames
    addNewFrameToCanvas,
    updateFrameProperties,
    removeFrameFromCanvas,
    duplicateFrameById: useCallback(
      (id: string) => dispatch(duplicateFrame(id)),
      [dispatch],
    ),
    reorderCanvasFrames,
    updateFrameHtmlContent,
    updateCanvasTheme,
  };
}
