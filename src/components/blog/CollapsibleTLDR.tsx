"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function CollapsibleTLDR({ text }: { text: string }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="py-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 text-left group"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-t-tertiary">
            TL;DR
          </span>
          <div className="h-px flex-1 bg-b-secondary" />
        </div>
        <ChevronDown
          className={`size-4 text-t-tertiary shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? "300px" : "0px", opacity: open ? 1 : 0 }}
      >
        <div className="mt-3 rounded-xl border border-b-strong bg-input-bg p-4">
          <p className="text-sm md:text-base text-t-primary leading-relaxed m-0">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}
