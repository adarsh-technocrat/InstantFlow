"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";

import { ArrowUpIcon, CloseIcon, FrameIcon, ImageIcon } from "@/lib/svg-icons";
import { PageMentionInput } from "./PageMentionInput";

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
  const selectedFrameIds = useAppSelector((s) => s.canvas.selectedFrameIds);
  const frames = useAppSelector((s) => s.canvas.frames);
  const theme = useAppSelector((s) => s.canvas.theme);
  const activeFrameLabel =
    selectedFrameIds.length === 1
      ? (frames.find((f) => f.id === selectedFrameIds[0])?.label ?? frameName)
      : frameName;

  const stateRef = useRef({ frames, theme });
  stateRef.current = { frames, theme };

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

  if (!isVisible) return null;

  return (
    <div
      className="chat-panel fixed top-[8%] z-30 flex flex-col rounded-xl shadow-lg"
      style={{
        right: `${RAIL_OFFSET + RIGHT_MARGIN}px`,
        width: `${panelWidth}px`,
        backgroundColor: "#0d0807",
      }}
    >
      <div
        className="absolute -left-2 top-0 z-10 flex h-full w-4 cursor-ew-resize items-center justify-center"
        onMouseDown={handleMouseDown}
        aria-hidden
      >
        <div className="h-full w-0.5 rounded-full bg-border opacity-0 hover:opacity-100" />
      </div>

      <div className="flex flex-row items-center justify-between p-2 pl-3">
        <h2 className="text-sm font-medium leading-[150%] text-foreground">
          Edit{" "}
          {activeFrameLabel.length > 15
            ? `${activeFrameLabel.slice(0, 15)}…`
            : activeFrameLabel}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="inline-flex w-8 h-8 min-h-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-secondary/40 text-secondary-foreground/30 px-2 py-1.5 shadow-xs transition-colors hover:bg-secondary/60"
        >
          <CloseIcon className="h-3 w-3" />
        </button>
      </div>

      <div className="w-full p-4">
        <form
          className="w-full overflow-visible rounded-xl border border-border/60 shadow-none focus-within:ring-2 focus-within:ring-ring/30"
          style={{ backgroundColor: "#2e2726" }}
        >
          {selectedFrameIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-1">
              {selectedFrameIds.map((id) => {
                const frame = frames.find((f) => f.id === id);
                if (!frame) return null;
                return (
                  <span
                    key={id}
                    className="mention-chip inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-white"
                    style={{
                      backgroundColor: "#6E4A2E",
                      borderColor: "#BF8456",
                    }}
                  >
                    <FrameIcon />
                    {frame.label}
                  </span>
                );
              })}
            </div>
          )}
          <PageMentionInput
            value={inputValue}
            onChange={setInputValue}
            pages={frames.map((f) => ({ id: f.id, label: f.label }))}
            placeholder="What changes do you want to make?"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
              }
            }}
            disabled={status === "submitted" || status === "streaming"}
            className="text-sm"
          />
          <div className="flex items-center justify-between p-2">
            <button
              type="button"
              aria-label="Attach image"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:text-muted-foreground hover:bg-secondary/40"
            >
              <ImageIcon className="size-4" />
            </button>
            <button
              type="submit"
              disabled={
                !inputValue.trim() ||
                status === "submitted" ||
                status === "streaming"
              }
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#8A87F8] text-white shadow-xs outline-none transition-colors hover:bg-[#8A87F8]/90 disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
            >
              <ArrowUpIcon className="size-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
