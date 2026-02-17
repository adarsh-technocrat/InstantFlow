"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setChatPanelOpen, toggleChatPanel } from "@/store/slices/uiSlice";
import { ChatPanel } from "./ChatPanel";
import {
  ReferenceModeIcon,
  SectionalEditIcon,
  StyleGuideIcon,
  TextEditingIcon,
} from "./icons";

function ChatToggleButton() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.ui.chatPanelOpen);

  return (
    <button
      type="button"
      onClick={() => dispatch(toggleChatPanel())}
      className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-panel-glass text-foreground outline-none transition-[color,box-shadow] backdrop-blur-md hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
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
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    </button>
  );
}

export function EditingModeDisplay() {
  const dispatch = useAppDispatch();
  const chatPanelOpen = useAppSelector((s) => s.ui.chatPanelOpen);
  const [referenceMode, setReferenceMode] = useState(false);
  const [sectionalMode, setSectionalMode] = useState(false);
  const [textEditingMode, setTextEditingMode] = useState(false);
  const [styleGuideOpen, setStyleGuideOpen] = useState(false);

  return (
    <div className="absolute right-4 top-20 z-20 flex flex-col items-center gap-4">
      <ChatPanel
        isVisible={chatPanelOpen}
        onClose={() => dispatch(setChatPanelOpen(false))}
      />
      <ChatToggleButton />
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-panel-glass px-2 py-3 backdrop-blur-md">
        <div className="relative">
          <button
            type="button"
            onClick={() => setReferenceMode((v) => !v)}
            className={`rounded-md p-2 ${referenceMode ? "reference-mode-button" : "text-foreground hover:bg-secondary/80"}`}
          >
            <ReferenceModeIcon
              color={
                referenceMode
                  ? "var(--primary-foreground)"
                  : "var(--foreground)"
              }
            />
          </button>
          {referenceMode && (
            <button
              type="button"
              onClick={() => setReferenceMode(false)}
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background text-xs font-bold text-foreground"
            >
              ×
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSectionalMode((v) => !v)}
          className={`relative rounded-md p-2 ${sectionalMode ? "reference-mode-button" : "text-foreground hover:bg-secondary/80"}`}
        >
          <SectionalEditIcon
            color={
              sectionalMode ? "var(--primary-foreground)" : "var(--foreground)"
            }
          />
          {sectionalMode && (
            <button
              type="button"
              onClick={() => setSectionalMode(false)}
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background text-xs font-bold text-foreground"
            >
              ×
            </button>
          )}
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setTextEditingMode((v) => !v)}
            className={`rounded-md p-2 ${textEditingMode ? "reference-mode-button" : "text-foreground hover:bg-secondary/80"}`}
          >
            <TextEditingIcon
              color={
                textEditingMode
                  ? "var(--primary-foreground)"
                  : "var(--foreground)"
              }
            />
          </button>
          {textEditingMode && (
            <button
              type="button"
              onClick={() => setTextEditingMode(false)}
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background text-xs font-bold text-foreground"
            >
              ×
            </button>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setStyleGuideOpen((v) => !v)}
            className={`rounded-md p-2 ${styleGuideOpen ? "reference-mode-button" : "text-foreground hover:bg-secondary/80"}`}
          >
            <StyleGuideIcon
              color={
                styleGuideOpen
                  ? "var(--primary-foreground)"
                  : "var(--foreground)"
              }
              width={20}
              height={20}
            />
          </button>
          {styleGuideOpen && (
            <button
              type="button"
              onClick={() => setStyleGuideOpen(false)}
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background text-xs font-bold text-foreground"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
