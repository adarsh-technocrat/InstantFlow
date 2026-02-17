"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { CloseIcon } from "./icons";

const MIN_PANEL_WIDTH = 360;
const MAX_PANEL_WIDTH = 600;
const DEFAULT_PANEL_WIDTH = 432;
const RAIL_OFFSET = 70;
const RIGHT_MARGIN = 16;

interface ChatPanelProps {
  isVisible: boolean;
  onClose: () => void;
  frameName?: string;
}

export function ChatPanel({
  isVisible,
  onClose,
  frameName = "Screen",
}: ChatPanelProps) {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const chatThreadRef = useRef<HTMLDivElement>(null);
  const selectedFrameIds = useAppSelector((s) => s.canvas.selectedFrameIds);
  const frames = useAppSelector((s) => s.canvas.frames);
  const activeFrameLabel =
    selectedFrameIds.length === 1
      ? (frames.find((f) => f.id === selectedFrameIds[0])?.label ?? frameName)
      : frameName;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const newWidth = window.innerWidth - e.clientX - RAIL_OFFSET - RIGHT_MARGIN;
    if (newWidth >= MIN_PANEL_WIDTH && newWidth <= MAX_PANEL_WIDTH) {
      setPanelWidth(newWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ew-resize";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;
    // Placeholder: could push to messages state or call onSend
    setInputValue("");
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  if (!isVisible) return null;

  return (
    <div
      className="chat-panel fixed top-[8%] bottom-[10%] z-30 flex flex-col rounded-xl shadow-lg"
      style={{
        right: `${RAIL_OFFSET + RIGHT_MARGIN}px`,
        width: `${panelWidth}px`,
        backgroundColor: "#0d0807",
      }}
    >
      {/* Resize handle */}
      <div
        className="absolute -left-2 top-0 z-10 flex h-full w-4 cursor-ew-resize items-center justify-center"
        onMouseDown={handleMouseDown}
        aria-hidden
      >
        <div className="h-full w-0.5 rounded-full bg-border opacity-0 hover:opacity-100" />
      </div>

      {/* Header */}
      <div className="flex flex-row items-center justify-between p-2 pl-3">
        <h2 className="text-sm font-medium leading-[150%] text-foreground">
          Edit{" "}
          {activeFrameLabel.length > 20
            ? `${activeFrameLabel.slice(0, 20)}…`
            : activeFrameLabel}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="inline-flex h-8 min-h-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground px-2 py-1.5 shadow-xs transition-colors hover:bg-secondary/80"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Messages area */}
      <div
        ref={chatThreadRef}
        id="chat-thread-area"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto p-2"
      >
        <div className="rounded-lg bg-accent/50 px-3 py-2 text-sm text-muted-foreground">
          Describe what you want to create. Messages will appear here.
        </div>
      </div>

      {/* Input area */}
      <div className="w-full p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/jpg, image/webp"
          multiple
          className="hidden"
        />
        <form
          onSubmit={handleSend}
          className="w-full overflow-hidden rounded-xl border border-border/60 shadow-none focus-within:ring-2 focus-within:ring-ring/30"
          style={{ backgroundColor: "#2e2726" }}
        >
          <div className="flex flex-col">
            <div
              aria-live="polite"
              className="overflow-hidden transition-[height] duration-200 ease-out"
              style={{ height: 0 }}
            >
              <div className="flex flex-wrap items-end gap-2 px-3 pt-3" />
            </div>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              name="prompt"
              placeholder="What changes do you want to make?"
              className="w-full max-h-32 min-h-12 resize-none rounded-none border-none bg-transparent p-4 text-sm text-white/90 shadow-none outline-none ring-0 placeholder:text-zinc-400 focus-visible:ring-0 md:max-h-48 md:min-h-16"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
          </div>
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleAttachmentClick}
                aria-label="Attach image"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-white/70 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                  viewBox="0 0 256 256"
                  className="size-4"
                >
                  <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z" />
                </svg>
              </button>
            </div>
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FF7F27] text-white shadow-xs outline-none transition-colors hover:bg-[#FF7F27]/90 disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                fill="currentColor"
                viewBox="0 0 256 256"
                className="size-4"
              >
                <path d="M205.66,117.66a8,8,0,0,1-11.32,0L136,59.31V216a8,8,0,0,1-16,0V59.31L61.66,117.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,205.66,117.66Z" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
