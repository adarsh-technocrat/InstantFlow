"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setChatPanelOpen, toggleChatPanel } from "@/store/slices/uiSlice";
import { ChatPanel } from "./ChatPanel";
import { StyleGuideIcon } from "@/lib/svg-icons";

function ChatToggleButton() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.ui.chatPanelOpen);

  return (
    <button
      type="button"
      onClick={() => dispatch(toggleChatPanel())}
      className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-canvas-panel text-white/90 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
      aria-label={isOpen ? "Close chat" : "Open chat"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}

export function EditingModeDisplay() {
  const dispatch = useAppDispatch();
  const chatPanelOpen = useAppSelector((s) => s.ui.chatPanelOpen);
  const [styleGuideOpen, setStyleGuideOpen] = useState(false);

  return (
    <div className="absolute right-4 top-20 z-20 flex flex-col items-center gap-4">
      <ChatPanel
        isVisible={chatPanelOpen}
        onClose={() => dispatch(setChatPanelOpen(false))}
      />
      <ChatToggleButton />
      <div className="flex flex-col items-center justify-center gap-4 rounded-full bg-canvas-panel px-2 py-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setStyleGuideOpen((v) => !v)}
            className={`rounded-full p-2 ${styleGuideOpen ? "reference-mode-button" : "text-white/90 hover:bg-white/10"}`}
          >
            <StyleGuideIcon
              color={
                styleGuideOpen
                  ? "var(--primary-foreground)"
                  : "rgba(255,255,255,0.9)"
              }
              width={20}
              height={20}
            />
          </button>
          {styleGuideOpen && (
            <button
              type="button"
              onClick={() => setStyleGuideOpen(false)}
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
