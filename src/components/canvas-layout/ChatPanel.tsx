"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addFrame,
  updateFrameHtml,
  setTheme,
  replaceTheme,
} from "@/store/slices/canvasSlice";
import { CloseIcon } from "./icons";
import { wrapScreenBody } from "@/lib/screen-utils";

const MIN_PANEL_WIDTH = 360;
const MAX_PANEL_WIDTH = 600;
const DEFAULT_PANEL_WIDTH = 432;
const RAIL_OFFSET = 70;
const RIGHT_MARGIN = 16;
const FRAME_SPACING = 420;

interface ChatPanelProps {
  isVisible: boolean;
  onClose: () => void;
  frameName?: string;
}

function extractBodyContent(fullHtml: string): string {
  if (!fullHtml) return "";
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) return bodyMatch[1].trim();
  return fullHtml;
}

export function ChatPanel({
  isVisible,
  onClose,
  frameName = "Screen",
}: ChatPanelProps) {
  const dispatch = useAppDispatch();
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const chatThreadRef = useRef<HTMLDivElement>(null);
  const selectedFrameIds = useAppSelector((s) => s.canvas.selectedFrameIds);
  const frames = useAppSelector((s) => s.canvas.frames);
  const theme = useAppSelector((s) => s.canvas.theme);
  const activeFrameLabel =
    selectedFrameIds.length === 1
      ? (frames.find((f) => f.id === selectedFrameIds[0])?.label ?? frameName)
      : frameName;

  const handleToolCall = useCallback(
    (
      toolName: string,
      args: unknown,
      addToolOutput: (params: {
        tool: string;
        toolCallId: string;
        output: unknown;
      }) => void,
      toolCallId: string,
    ) => {
      try {
        switch (toolName) {
          case "read_screen": {
            const { id } = args as { id: string };
            const frame = frames.find((f) => f.id === id);
            const html = frame?.html ? extractBodyContent(frame.html) : "";
            addToolOutput({
              tool: "read_screen",
              toolCallId,
              output: html || "(empty screen)",
            });
            break;
          }
          case "read_theme": {
            addToolOutput({
              tool: "read_theme",
              toolCallId,
              output: JSON.stringify(theme, null, 2),
            });
            break;
          }
          case "create_screen": {
            const { name, screen_html } = args as {
              name: string;
              screen_html: string;
            };
            const lastFrame = frames[frames.length - 1];
            const left = lastFrame ? lastFrame.left + FRAME_SPACING : 0;
            const top = lastFrame ? lastFrame.top : 0;
            const fullHtml = wrapScreenBody(screen_html, theme);
            dispatch(
              addFrame({
                label: name,
                left,
                top,
                html: fullHtml,
              }),
            );
            addToolOutput({
              tool: "create_screen",
              toolCallId,
              output: { success: true, message: `Created screen "${name}"` },
            });
            break;
          }
          case "update_screen": {
            const { id, screen_html } = args as {
              id: string;
              screen_html: string;
            };
            const fullHtml = wrapScreenBody(screen_html, theme);
            dispatch(updateFrameHtml({ id, html: fullHtml }));
            addToolOutput({
              tool: "update_screen",
              toolCallId,
              output: { success: true },
            });
            break;
          }
          case "edit_screen": {
            const { id, find, replace } = args as {
              id: string;
              find: string;
              replace: string;
            };
            const frame = frames.find((f) => f.id === id);
            if (!frame?.html) {
              addToolOutput({
                tool: "edit_screen",
                toolCallId,
                output: { success: false, error: "Screen not found" },
              });
              return;
            }
            if (!frame.html.includes(find)) {
              addToolOutput({
                tool: "edit_screen",
                toolCallId,
                output: {
                  success: false,
                  error:
                    "Find string not found - ensure exact match from read_screen",
                },
              });
              return;
            }
            const newHtml = frame.html.replace(find, replace);
            dispatch(updateFrameHtml({ id, html: newHtml }));
            addToolOutput({
              tool: "edit_screen",
              toolCallId,
              output: { success: true },
            });
            break;
          }
          case "update_theme": {
            const { updates } = args as { updates: Record<string, string> };
            dispatch(setTheme(updates));
            addToolOutput({
              tool: "update_theme",
              toolCallId,
              output: { success: true },
            });
            break;
          }
          case "build_theme": {
            const { theme_vars } = args as {
              description: string;
              theme_vars: Record<string, string>;
            };
            dispatch(replaceTheme(theme_vars));
            addToolOutput({
              tool: "build_theme",
              toolCallId,
              output: {
                success: true,
                message: "Theme built from user prompt",
              },
            });
            break;
          }
          default:
            addToolOutput({
              tool: toolName,
              toolCallId,
              output: { error: `Unknown tool: ${toolName}` },
            });
        }
      } catch (err) {
        addToolOutput({
          tool: toolName,
          toolCallId,
          output: {
            error: err instanceof Error ? err.message : "Tool execution failed",
          },
        });
      }
    },
    [dispatch, frames, theme],
  );

  const stateRef = useRef({ frames, theme });
  stateRef.current = { frames, theme };

  const transportRef = useRef<DefaultChatTransport<UIMessage> | null>(null);
  if (!transportRef.current) {
    transportRef.current = new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: (options) => ({
        body: {
          ...options.body,
          messages: options.messages,
          id: options.id,
          trigger: options.trigger,
          messageId: options.messageId,
          frames: stateRef.current.frames,
          theme: stateRef.current.theme,
        },
      }),
    });
  }
  const transport = transportRef.current;

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall({
      toolCall,
    }: {
      toolCall: {
        dynamic?: boolean;
        toolName: string;
        input: unknown;
        toolCallId: string;
      };
    }) {
      if (toolCall.dynamic) return;
      handleToolCall(
        toolCall.toolName,
        toolCall.input,
        (params) => addToolOutput(params),
        toolCall.toolCallId,
      );
    },
  });

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

  const handleSend = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!inputValue.trim()) return;
      sendMessage({ text: inputValue.trim() });
      setInputValue("");
    },
    [inputValue, sendMessage],
  );

  useEffect(() => {
    chatThreadRef.current?.scrollTo({
      top: chatThreadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

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

      <div
        ref={chatThreadRef}
        id="chat-thread-area"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto p-2"
      >
        {messages.map(
          (msg: {
            id: string;
            role: string;
            parts?: Array<{ type: string; text?: string; state?: string }>;
            content?: string;
          }) => (
            <div
              key={msg.id}
              className={`flex w-full ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`w-fit max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "text-white"
                    : msg.role === "assistant"
                      ? "bg-muted/50 text-stone-300"
                      : "bg-muted/30"
                }`}
                style={
                  msg.role === "user"
                    ? { backgroundColor: "#2e2726" }
                    : undefined
                }
              >
                {msg.parts?.map(
                  (
                    part: { type: string; text?: string; state?: string },
                    i: number,
                  ) => {
                    if (part.type === "text") {
                      return (
                        <p key={i} className="whitespace-pre-wrap">
                          {part.text}
                        </p>
                      );
                    }
                    if (part.type.startsWith("tool-")) {
                      const name = part.type.replace("tool-", "");
                      return (
                        <div key={i} className="mt-2 text-xs text-stone-400">
                          {name}:{" "}
                          {part.state === "output-available" ? "✓" : "..."}
                        </div>
                      );
                    }
                    return null;
                  },
                ) ?? (typeof msg.content === "string" ? msg.content : null)}
              </div>
            </div>
          ),
        )}
        {status === "streaming" && (
          <div className="flex w-full justify-start">
            <div className="w-fit max-w-[85%] rounded-lg bg-muted/50 px-3 py-2 text-sm text-stone-300">
              Thinking…
            </div>
          </div>
        )}
      </div>

      <div className="w-full p-4">
        <form
          onSubmit={handleSend}
          className="w-full overflow-hidden rounded-xl border border-border/60 shadow-none focus-within:ring-2 focus-within:ring-ring/30"
          style={{ backgroundColor: "#2e2726" }}
        >
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
            placeholder="Describe what you want to create or change…"
            className="w-full max-h-32 min-h-12 resize-none rounded-none border-none bg-transparent p-4 text-sm text-white/90 shadow-none outline-none ring-0 placeholder:text-zinc-400 focus-visible:ring-0"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <div className="flex items-center justify-end p-2">
            <button
              type="submit"
              disabled={!inputValue.trim() || status === "streaming"}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#8A87F8] text-white shadow-xs outline-none transition-colors hover:bg-[#8A87F8]/90 disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
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
