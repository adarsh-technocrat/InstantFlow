export const FRAME_WIDTH = 430;
export const FRAME_HEIGHT = 932;

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
