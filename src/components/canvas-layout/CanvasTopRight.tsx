"use client";

import { Crown, Play, Share2, User, Workflow } from "lucide-react";

const btnClass =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white/90 disabled:pointer-events-none disabled:opacity-50";

export function CanvasTopRight() {
  return (
    <div className="absolute right-4 top-4 z-10 flex w-auto flex-row items-center gap-1 rounded-xl bg-canvas-panel px-2 py-1.5">
      {/* Prototype */}
      <button
        type="button"
        className={btnClass}
        disabled
        title="Prototype (coming soon)"
      >
        <Workflow className="size-4" />
        <span>Prototype</span>
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/60">
          Soon
        </span>
      </button>

      <div className="h-4 w-px bg-white/20" aria-hidden />

      {/* Preview */}
      <button type="button" className={btnClass} title="Preview">
        <Play className="size-4" />
        <span>Preview</span>
      </button>

      {/* Share */}
      <button type="button" className={btnClass} title="Share">
        <Share2 className="size-4" />
        <span>Share</span>
      </button>

      <div className="h-4 w-px bg-white/20" aria-hidden />

      {/* Upgrade */}
      <button type="button" className={btnClass} title="Upgrade">
        <Crown className="size-4" />
        <span>Upgrade</span>
      </button>

      {/* User Avatar */}
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white/90"
        aria-label="User profile"
      >
        <User className="size-5" />
      </button>
    </div>
  );
}
