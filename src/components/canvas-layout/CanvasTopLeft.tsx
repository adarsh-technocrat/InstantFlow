"use client";

export function CanvasTopLeft() {
  return (
    <div
      className="absolute left-4 top-4 z-10 flex w-auto flex-row items-center gap-2 rounded-xl bg-panel-glass p-2 backdrop-blur-md"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <span className="text-sm font-medium text-foreground">Flow Builder</span>
    </div>
  );
}
