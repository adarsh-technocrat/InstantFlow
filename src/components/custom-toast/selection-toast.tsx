"use client";

import { Copy, Trash2 } from "lucide-react";
import { SectionalEditIcon } from "@/lib/svg-icons";

interface SelectionToastProps {
  message: string;
  onCopy?: () => void;
  onDelete?: () => void;
}

export function SelectionToast({
  message,
  onCopy,
  onDelete,
}: SelectionToastProps) {
  const btnClass =
    "shrink-0 inline-flex size-8 items-center justify-center rounded-md text-white/70 transition-colors duration-200 hover:bg-white/10 hover:text-white/90";

  return (
    <div className="flex w-[550px] max-w-[calc(100vw-32px)] items-center justify-between gap-2 rounded-xl bg-canvas-panel p-2 duration-300">
      <div className="flex items-center justify-start gap-2">
        <SectionalEditIcon color="rgba(255,255,255,0.9)" />
        <p className="text-sm font-normal text-white/90">{message}</p>
      </div>
      <div className="flex items-center gap-1">
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className={btnClass}
            title="Copy"
            aria-label="Copy"
          >
            <Copy className="size-4" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className={btnClass}
            title="Delete"
            aria-label="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
