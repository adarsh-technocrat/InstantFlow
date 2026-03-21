"use client";

import { useRef, useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { setAgentLogVisible } from "@/store/slices/uiSlice";
import { StyleGuideIcon } from "@/lib/svg-icons";
import { sendChatMessage } from "@/lib/chat-bridge";
import { ChatPanel } from "./ChatPanel";

export function EditingModeDisplay() {
  const dispatch = useAppDispatch();
  const [styleGuideOpen, setStyleGuideOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    sendChatMessage(inputValue.trim());
    setInputValue("");
    // Auto-open agent log so user sees activity
    dispatch(setAgentLogVisible(true));
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      {/* ChatPanel — invisible but runs useChat hook and processes agent logic */}
      <ChatPanel isVisible={false} onClose={() => {}} />

      {/* Bottom center — AI input box */}
      <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 w-full max-w-[600px] px-4">
        <div className="rounded-2xl border border-white/[0.18] bg-[#111113]/95 backdrop-blur-2xl shadow-[0_8px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] transition-all focus-within:border-white/[0.28] focus-within:shadow-[0_8px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.1)]">
          <div className="px-4 pt-4 pb-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what to design..."
              rows={2}
              className="w-full bg-transparent text-[15px] text-white placeholder-white/30 outline-none resize-none leading-relaxed max-h-[140px] min-h-[52px]"
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 140) + "px";
              }}
            />
          </div>

          <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.1]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex size-7 items-center justify-center rounded-md text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                title="Attach image"
              >
                <svg width="15" height="15" viewBox="0 0 256 256" fill="currentColor">
                  <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" />
                </svg>
              </button>
              <span className="text-[10px] font-mono text-white/30 border border-white/[0.1] rounded px-1.5 py-0.5 bg-white/[0.04]">
                Flutter · Dart
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-white/20 border border-white/[0.1] rounded px-1.5 py-0.5 hidden sm:inline bg-white/[0.04]">
                ⌘ Enter
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                className="inline-flex size-8 items-center justify-center rounded-lg bg-white text-black transition-all hover:bg-white/90 disabled:opacity-20 disabled:pointer-events-none active:scale-95"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right side tools */}
      <div className="absolute right-4 top-16 z-20 flex flex-col items-center gap-2">
        <div className="flex flex-col items-center gap-1 rounded-lg border border-white/[0.12] bg-black/60 backdrop-blur-sm p-1">
          <button
            type="button"
            onClick={() => setStyleGuideOpen((v) => !v)}
            className={`rounded-md p-2 transition-colors ${
              styleGuideOpen
                ? "bg-white/[0.12] text-white"
                : "text-white/50 hover:bg-white/[0.06] hover:text-white"
            }`}
            title="Style Guide"
          >
            <StyleGuideIcon
              color="currentColor"
              width={18}
              height={18}
            />
          </button>
        </div>
      </div>
    </>
  );
}
