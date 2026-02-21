"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { html as htmlBeautify } from "js-beautify";
import { createHighlighter } from "shiki";

const BEAUTIFY_OPTIONS = {
  indent_size: 2,
  indent_inner_html: true,
  indent_char: " ",
  wrap_line_length: 0,
  wrap_attributes: "auto" as const,
};

export interface CodeDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  code: string;
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 256 256"
      className="size-3.5"
    >
      <path d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 256 256"
      className="size-4 opacity-50"
    >
      <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 256 256"
      className="size-3.5"
    >
      <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 256 256"
      className="size-4"
    >
      <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
    </svg>
  );
}

export function CodeDialog({ open, onClose, title, code }: CodeDialogProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  const [formattedCode, setFormattedCode] = useState<string>("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(formattedCode || code || "").catch(() => {});
  }, [formattedCode, code]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([formattedCode || code || ""], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [formattedCode, code, title]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      let text = code || "(empty)";
      if (text !== "(empty)") {
        try {
          text = htmlBeautify(text, BEAUTIFY_OPTIONS);
          if (!cancelled) setFormattedCode(text);
        } catch {
          /* keep original if beautify fails */
          if (!cancelled) setFormattedCode(text);
        }
      } else {
        setFormattedCode("");
      }
      if (text === "(empty)") {
        setHighlightedCode(
          '<pre class="shiki shiki-themes github-light github-dark" style="background-color:#fff;--shiki-dark-bg:#24292e;color:#24292e;--shiki-dark:#e1e4e8"><code><span class="line">(empty)</span></code></pre>',
        );
        return;
      }
      try {
        const highlighter = await createHighlighter({
          themes: ["github-light", "github-dark"],
          langs: ["html"],
        });
        const html = await highlighter.codeToHtml(text, {
          lang: "html",
          themes: { light: "github-light", dark: "github-dark" },
        });
        if (!cancelled) setHighlightedCode(html);
      } catch {
        if (!cancelled) {
          const escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          setHighlightedCode(
            `<pre class="shiki shiki-themes github-light github-dark" style="background-color:#fff;--shiki-dark-bg:#24292e;color:#24292e;--shiki-dark:#e1e4e8"><code><span class="line">${escaped}</span></code></pre>`,
          );
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handler);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    const btn = closeButtonRef.current;
    if (!open || !btn) return;
    const handleClose = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      onClose();
    };
    btn.addEventListener("click", handleClose, { capture: true });
    btn.addEventListener("pointerdown", handleClose, { capture: true });
    return () => {
      btn.removeEventListener("click", handleClose, { capture: true });
      btn.removeEventListener("pointerdown", handleClose, { capture: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  const dialog = (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="code-dialog-title"
      aria-describedby="code-dialog-description"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />
      <div
        className="data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-white/10 bg-canvas-panel p-0 shadow-2xl duration-200 sm:max-w-lg md:max-w-[min(calc(100%-2rem),var(--container-5xl))] focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-6 pb-4">
          <div className="flex shrink-0 items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2
                id="code-dialog-title"
                className="text-lg font-semibold leading-none text-white/95"
              >
                {title} Code
              </h2>
              <p
                id="code-dialog-description"
                className="sr-only text-sm text-white/60"
              >
                View and copy the generated code for components
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="flex h-9 w-32 items-center justify-between gap-2 whitespace-nowrap rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:text-white/50"
              >
                <span>HTML</span>
                <ChevronDownIcon />
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-white/15 px-4 py-2 text-sm font-medium text-white shadow-sm outline-none transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/30 active:scale-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0"
              >
                <DownloadIcon />
                Download
              </button>
              <button
                ref={closeButtonRef}
                type="button"
                className="relative z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-sm text-white/70 transition-opacity hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[#0d0807] disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="relative flex min-h-0 flex-1 overflow-auto rounded-lg">
                <div
                  className="shiki-themes code-dialog-shiki h-full min-h-0 flex-1 overflow-auto p-4 text-[13px] select-none [&_pre]:bg-transparent! [&_pre]:p-0! [&_pre]:whitespace-pre [&_pre>code]:font-mono"
                  dangerouslySetInnerHTML={{ __html: highlightedCode }}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute right-2 top-2 z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-white/80 outline-none transition-colors hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white/30 active:scale-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                  title="Copy"
                >
                  <CopyIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
