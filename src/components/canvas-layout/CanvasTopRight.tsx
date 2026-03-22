"use client";

import { Crown, Eye, Share2, User } from "lucide-react";
import { ThemeToggleCompact } from "@/components/ThemeToggle";

const btnClass =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-mono font-medium uppercase tracking-wider text-t-secondary transition-colors hover:bg-input-bg hover:text-white disabled:pointer-events-none disabled:opacity-40";

export function CanvasTopRight() {
  return (
    <div className="absolute right-0 top-0 z-10 flex h-12 items-center gap-1 px-4">
      <button type="button" className={btnClass} title="Preview">
        <Eye className="size-3.5" />
        <span>Preview</span>
      </button>

      <button type="button" className={btnClass} title="Share">
        <Share2 className="size-3.5" />
        <span>Share</span>
      </button>

      <div className="mx-1 h-4 w-px bg-white/[0.12]" />

      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md border border-b-primary px-3 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-t-primary hover:bg-input-bg hover:text-white transition-colors"
        title="Upgrade"
      >
        <Crown className="size-3.5" />
        <span>Upgrade</span>
      </button>

      <div className="mx-1 h-4 w-px bg-white/[0.12]" />

      <ThemeToggleCompact />

      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-full border border-b-primary text-t-secondary transition-colors hover:bg-input-bg hover:text-t-primary"
        aria-label="User profile"
      >
        <User className="size-4" />
      </button>
    </div>
  );
}
