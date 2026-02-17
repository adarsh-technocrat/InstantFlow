"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { CloseIcon } from "./icons";

const MIN_PANEL_WIDTH = 360;
const MAX_PANEL_WIDTH = 600;
const DEFAULT_PANEL_WIDTH = 432;
const RAIL_OFFSET = 70;

interface ChatPanelProps {
  isVisible: boolean;
  onClose: () => void;
  /** Optional frame/screen name for header */
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
    const newWidth = window.innerWidth - e.clientX - RAIL_OFFSET;
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

  const handleSend = () => {
    if (!inputValue.trim()) return;
    // Placeholder: could push to messages state or call onSend
    setInputValue("");
  };

  if (!isVisible) return null;

  return (
    <div
      className="chat-panel fixed top-4 z-30 flex max-h-[calc(100vh-8rem)] flex-col rounded-xl bg-panel-glass backdrop-blur-md"
      style={{
        right: `${RAIL_OFFSET}px`,
        width: `${panelWidth}px`,
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
      <div className="flex flex-row items-center justify-between border-b border-border/60 p-2 pl-3">
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
        className="flex-1 space-y-4 overflow-y-auto p-2"
      >
        <div className="rounded-lg bg-accent/50 px-3 py-2 text-sm text-muted-foreground">
          Describe what you want to create. Messages will appear here.
        </div>
      </div>

      {/* Input area */}
      <div className="w-full border-t border-border/60 p-2">
        <div className="flex gap-2 rounded-lg border border-border/60 bg-background/80 p-1.5 focus-within:ring-2 focus-within:ring-ring/30">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe what you want to create"
            rows={1}
            className="min-h-9 flex-1 resize-none rounded-md bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
