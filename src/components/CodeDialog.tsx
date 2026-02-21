"use client";

import { useCallback, useEffect, useState } from "react";
import { html as htmlBeautify } from "js-beautify";
import { createHighlighter } from "shiki";
import { Download, Copy, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

export interface CodeDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  code: string;
}

export function CodeDialog({ open, onClose, title, code }: CodeDialogProps) {
  const [highlightedCode, setHighlightedCode] = useState("");
  const [formattedCode, setFormattedCode] = useState("");
  const [copied, setCopied] = useState(false);

  const displayCode = formattedCode || code || "";

  const copy = useCallback(() => {
    navigator.clipboard.writeText(displayCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [displayCode]);

  const download = useCallback(() => {
    const blob = new Blob([displayCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [displayCode, title]);

  useEffect(() => {
    let cancelled = false;
    const text = code || "(empty)";
    const formatted =
      text === "(empty)" ? "" : htmlBeautify(text, { indent_size: 2 });
    if (!cancelled) setFormattedCode(formatted);

    if (text === "(empty)") {
      setHighlightedCode("<pre><code>(empty)</code></pre>");
      return () => {
        cancelled = true;
      };
    }

    createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: ["html"],
    })
      .then((h) =>
        h.codeToHtml(formatted, {
          lang: "html",
          themes: { light: "github-light", dark: "github-dark" },
        }),
      )
      .then((html) => !cancelled && setHighlightedCode(html))
      .catch(
        () =>
          !cancelled &&
          setHighlightedCode(
            `<pre><code>${formatted.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`,
          ),
      );

    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-canvas-panel p-0 sm:max-w-lg md:max-w-[min(calc(100%-2rem),var(--container-5xl))]"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6 pb-4">
          <DialogHeader className="flex shrink-0 flex-row items-start justify-between gap-4 space-y-0">
            <DialogTitle className="text-lg font-semibold text-white/95">
              {title} Code
            </DialogTitle>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={download}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/30"
              >
                <Download className="size-3.5" />
                Download
              </button>
              <DialogClose asChild>
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-sm text-white/70 hover:text-white"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="relative min-h-0 flex-1 overflow-auto rounded-lg">
            <div
              className="shiki-themes code-dialog-shiki p-4 text-[13px] [&_pre]:bg-transparent [&_pre]:p-0 [&_pre]:whitespace-pre [&_pre>code]:font-mono"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
            <button
              type="button"
              onClick={copy}
              className="absolute right-2 top-2 rounded-md bg-white/10 px-2.5 py-1.5 text-white/80 hover:bg-white/20"
              title="Copy"
            >
              {copied ? (
                <span className="text-xs font-medium">Copied!</span>
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
