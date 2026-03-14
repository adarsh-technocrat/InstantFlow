export const FRAME_WIDTH = 430;
export const FRAME_HEIGHT = 932;
export const FRAME_GAP = 28;
export const FRAME_STEP = FRAME_WIDTH + FRAME_GAP;

export function convertClientPointToContentPoint(
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

export type FitViewPadding =
  | number
  | { top?: number; right?: number; bottom?: number; left?: number };

function normalizePadding(padding: FitViewPadding = 60) {
  if (typeof padding === "number") {
    return { top: padding, right: padding, bottom: padding, left: padding };
  }
  return {
    top: padding.top ?? 0,
    right: padding.right ?? 0,
    bottom: padding.bottom ?? 0,
    left: padding.left ?? 0,
  };
}

export function computeFitViewTransform(
  frames: Array<{ left: number; top: number; width?: number; height?: number }>,
  containerWidth: number,
  containerHeight: number,
  padding: FitViewPadding = 60,
  maxZoom = 1,
): { x: number; y: number; scale: number } | null {
  if (frames.length === 0) return null;

  const p = normalizePadding(padding);

  const minX = Math.min(...frames.map((f) => f.left));
  const minY = Math.min(...frames.map((f) => f.top));
  const maxX = Math.max(...frames.map((f) => f.left + (f.width ?? FRAME_WIDTH)));
  const maxY = Math.max(...frames.map((f) => f.top + (f.height ?? FRAME_HEIGHT)));

  const contentW = maxX - minX;
  const contentH = maxY - minY;

  if (contentW <= 0 || contentH <= 0) return null;

  const availW = containerWidth - p.left - p.right;
  const availH = containerHeight - p.top - p.bottom;
  const scale = Math.min(availW / contentW, availH / contentH, maxZoom);

  const x = p.left + (availW - contentW * scale) / 2 - minX * scale;
  const y = p.top + (availH - contentH * scale) / 2 - minY * scale;

  return { x, y, scale };
}

export function getFramesIntersectingRectangle(
  frames: {
    id: string;
    left: number;
    top: number;
    width?: number;
    height?: number;
  }[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  defaultWidth: number,
  defaultHeight: number,
) {
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);
  return frames.filter((f) => {
    const w = f.width ?? defaultWidth;
    const h = f.height ?? defaultHeight;
    const fRight = f.left + w;
    const fBottom = f.top + h;
    return !(
      right < f.left ||
      left > fRight ||
      bottom < f.top ||
      top > fBottom
    );
  });
}
