"use client";

import { useState, type ReactNode } from "react";

export function CollapsibleTLDR({ children, text }: { children?: ReactNode; text?: string }) {
  const [open, setOpen] = useState(true);

  const content = children || text;
  if (!content) return null;

  return (
    <div className="my-8">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 text-left mb-2"
      >
        <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-t-tertiary">TL;DR</span>
        <div className="h-px flex-1 bg-b-secondary" />
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`text-t-tertiary shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? "500px" : "0px", opacity: open ? 1 : 0 }}
      >
        <div className="rounded-xl border border-b-strong bg-input-bg p-5">
          <div className="text-sm md:text-base text-t-primary leading-relaxed [&>p]:mb-0">
            {typeof content === "string" ? <p className="m-0">{content}</p> : content}
          </div>
        </div>
      </div>
    </div>
  );
}
