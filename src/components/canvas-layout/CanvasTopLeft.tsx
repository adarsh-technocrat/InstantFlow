"use client";

export function CanvasTopLeft() {
  return (
    <div
      className="absolute left-4 top-4 z-10 flex w-auto flex-row items-center gap-2 rounded-xl bg-canvas-panel p-2"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <span className="text-sm font-medium text-white/90">Flow Builder</span>
    </div>
  );
}
