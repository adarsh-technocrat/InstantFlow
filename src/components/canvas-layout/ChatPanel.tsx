"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addFrameWithId,
  updateFrameHtml,
  setTheme,
  replaceTheme,
} from "@/store/slices/canvasSlice";
import { Brain, ChevronDown, CircleX } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { CloseIcon } from "./icons";
import { PageMentionInput } from "./PageMentionInput";

function getToolDisplayLabel(
  toolType: string,
  frames: { id: string; label: string }[],
  input?: { id?: string; name?: string },
  isCalled?: boolean,
): string {
  const toTitle = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

  if (toolType === "step_analyzed_request")
    return isCalled ? "Analyzed request" : "Analyzing request…";
  if (toolType === "step_planned_screens")
    return isCalled ? "Planned screens" : "Planning screens…";
  if (toolType === "step_planned_visual_identity")
    return isCalled ? "Planned visual identity" : "Planning visual identity…";

  if (toolType === "build_theme")
    return isCalled ? "Created theme" : "Creating theme…";
  if (toolType === "update_theme")
    return isCalled ? "Updated theme" : "Updating theme…";

  if (toolType === "create_screen" && input?.name) {
    return isCalled
      ? `Created ${toTitle(input.name)} screen`
      : `Creating ${toTitle(input.name)} screen…`;
  }
  if (
    input?.id &&
    (toolType === "read_screen" ||
      toolType === "update_screen" ||
      toolType === "edit_screen")
  ) {
    const frame = frames.find((f) => f.id === input.id);
    const label = frame?.label ?? "Screen";
    const name = toTitle(label);
    if (toolType === "read_screen")
      return isCalled ? `Read ${name} screen` : `Reading ${name} screen…`;
    if (toolType === "edit_screen")
      return isCalled ? `Edited ${name} screen` : `Editing ${name} screen…`;
    if (toolType === "update_screen")
      return isCalled ? `Updated ${name} screen` : `Updating ${name} screen…`;
  }

  const base = toTitle(toolType.replace(/_/g, " "));
  return isCalled ? base : `${base}…`;
}

interface MessagePart {
  type: string;
  text?: string;
  state?: string;
  toolCallId?: string;
  input?: {
    id?: string;
    name?: string;
    screen_html?: string;
  };
}

function ReasoningBlock({
  text,
  isStreaming,
  isComplete,
}: {
  text: string;
  isStreaming?: boolean;
  isComplete?: boolean;
}) {
  const [expanded, setExpanded] = useState(() => !!isStreaming && !isComplete);

  useEffect(() => {
    if (isComplete) {
      setExpanded(false);
    }
  }, [isComplete]);

  return (
    <div className="not-prose flex w-full flex-col transition-all">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="inline-flex w-full items-center justify-between gap-1 px-0 py-1 text-left"
      >
        <div className="flex items-center gap-1.5">
          <Brain
            className="size-3.5 shrink-0 text-white/90"
            strokeWidth={1.5}
          />
          <span className="font-mono text-[11px] text-white/90 uppercase tracking-wider">
            {expanded ? "Hide thinking" : "Thinking"}
          </span>
        </div>
        <ChevronDown
          className={`size-3.5 shrink-0 text-white/90 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          strokeWidth={2}
        />
      </button>
      {expanded && text && (
        <div className="chat-markdown py-1.5 text-sm text-white/60 font-sans">
          <ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

function AssistantMessageContent({
  parts,
  frames,
  isStreaming,
}: {
  parts: MessagePart[];
  frames: { id: string; label: string }[];
  isStreaming?: boolean;
}) {
  const blocks: Array<
    | { kind: "text"; text: string }
    | { kind: "reasoning"; text: string }
    | { kind: "tools"; tools: MessagePart[] }
  > = [];
  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    if (part.type === "text") {
      blocks.push({ kind: "text", text: part.text ?? "" });
      i++;
    } else if (part.type === "reasoning") {
      blocks.push({ kind: "reasoning", text: part.text ?? "" });
      i++;
    } else if (part.type.startsWith("tool-")) {
      const toolGroup: MessagePart[] = [];
      while (i < parts.length && parts[i].type.startsWith("tool-")) {
        toolGroup.push(parts[i]);
        i++;
      }
      blocks.push({ kind: "tools", tools: toolGroup });
    } else {
      i++;
    }
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, bi) =>
        block.kind === "text" ? (
          block.text ? (
            <div key={bi} className="chat-markdown">
              <ReactMarkdown components={markdownComponents}>
                {block.text}
              </ReactMarkdown>
            </div>
          ) : null
        ) : block.kind === "reasoning" ? (
          <ReasoningBlock
            key={bi}
            text={block.text}
            isStreaming={isStreaming}
            isComplete={!isStreaming || bi < blocks.length - 1}
          />
        ) : (
          <div key={bi} className="flex flex-wrap gap-2">
            {block.tools.map((tool, ti) => {
              const toolType = tool.type.replace("tool-", "");
              const isCalled = tool.state === "output-available";
              const isError = tool.state === "output-error";
              const isCalling =
                !isCalled &&
                !isError &&
                (tool.state === "input-streaming" ||
                  tool.state === "input-available" ||
                  !tool.state);
              const label = getToolDisplayLabel(
                toolType,
                frames,
                tool.input,
                isCalled || isError,
              );
              return (
                <div
                  key={ti}
                  className={`not-prose flex w-fit flex-col rounded-md border transition-all ${
                    isError
                      ? "border-red-500/40 bg-red-500/10"
                      : isCalled
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-[#8A87F8]/40 bg-[#8A87F8]/10"
                  }`}
                >
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-between gap-2 px-2 py-1"
                  >
                    <div className="flex items-center gap-2">
                      {isError ? (
                        <CircleX
                          className="size-3.5 shrink-0 text-red-400"
                          strokeWidth={2}
                        />
                      ) : isCalled ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="1em"
                          height="1em"
                          fill="currentColor"
                          viewBox="0 0 256 256"
                          className="size-3.5 shrink-0 text-emerald-400"
                        >
                          <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" />
                        </svg>
                      ) : isCalling ? (
                        <span className="inline-block size-3.5 shrink-0 animate-pulse rounded-full bg-[#8A87F8]/80" />
                      ) : (
                        <span className="inline-block size-3.5 shrink-0 rounded-full bg-white/40" />
                      )}
                      <span
                        className={`font-mono text-[11px] uppercase tracking-wider ${
                          isError
                            ? "text-red-300"
                            : isCalled
                              ? "text-emerald-300"
                              : "text-white/90"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        ),
      )}
    </div>
  );
}

const markdownComponents: React.ComponentProps<
  typeof ReactMarkdown
>["components"] = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-4">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-4">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  code: ({ children }) => (
    <code className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-xs">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-lg bg-muted/80 p-3 font-mono text-xs">
      {children}
    </pre>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  h1: ({ children }) => (
    <h1 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-3 text-sm font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-2 text-sm font-medium first:mt-0">{children}</h3>
  ),
};

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

  const stateRef = useRef({ frames, theme });
  stateRef.current = { frames, theme };

  const handleFrameAction = useCallback(
    (data: {
      action: string;
      payload?: {
        id?: string;
        label?: string;
        left?: number;
        top?: number;
        html?: string;
        updates?: Record<string, string>;
        theme?: Record<string, string>;
      };
    }) => {
      if (!data?.action) return;
      switch (data.action) {
        case "add":
          if (data.payload?.id && data.payload?.label !== undefined) {
            dispatch(
              addFrameWithId({
                id: data.payload.id,
                label: data.payload.label,
                left: data.payload.left ?? 0,
                top: data.payload.top ?? 0,
                html: data.payload.html ?? "",
              }),
            );
          }
          break;
        case "updateHtml":
          if (data.payload?.id && data.payload?.html !== undefined) {
            dispatch(
              updateFrameHtml({ id: data.payload.id, html: data.payload.html }),
            );
          }
          break;
        case "setTheme":
          if (data.payload?.updates) {
            dispatch(setTheme(data.payload.updates));
          }
          break;
        case "replaceTheme":
          if (data.payload?.theme) {
            dispatch(replaceTheme(data.payload.theme));
          }
          break;
      }
    },
    [dispatch],
  );

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

  const { messages, sendMessage, status } = useChat({
    transport,
    onData: (dataPart) => {
      if (dataPart.type === "data-frame-action" && dataPart.data) {
        handleFrameAction(
          dataPart.data as Parameters<typeof handleFrameAction>[0],
        );
      }
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
        className="min-h-0 flex-1 space-y-4 overflow-y-auto scrollbar-hide p-2"
      >
        {messages.map(
          (
            msg: {
              id: string;
              role: string;
              parts?: Array<{ type: string; text?: string; state?: string }>;
              content?: string;
            },
            msgIndex: number,
          ) => (
            <div
              key={msg.id}
              className={`flex w-full ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "w-fit max-w-[85%] text-white"
                    : msg.role === "assistant"
                      ? "w-full bg-muted/50 text-stone-300"
                      : "w-fit max-w-[85%] bg-muted/30"
                }`}
                style={
                  msg.role === "user"
                    ? { backgroundColor: "#2e2726" }
                    : undefined
                }
              >
                {msg.role === "assistant" ? (
                  msg.parts && msg.parts.length > 0 ? (
                    <AssistantMessageContent
                      parts={msg.parts as MessagePart[]}
                      frames={frames}
                      isStreaming={
                        msg.role === "assistant" &&
                        status === "streaming" &&
                        msgIndex === messages.length - 1
                      }
                    />
                  ) : typeof msg.content === "string" ? (
                    <div className="chat-markdown">
                      <ReactMarkdown components={markdownComponents}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : null
                ) : msg.role === "user" ? (
                  (() => {
                    if (typeof msg.content === "string") return msg.content;
                    const textPart = msg.parts?.find(
                      (p: { type: string; text?: string }) =>
                        p.type === "text" && p.text,
                    );
                    return textPart?.text ?? null;
                  })()
                ) : null}
              </div>
            </div>
          ),
        )}
        {(status === "submitted" || status === "streaming") && (
          <div className="flex w-full justify-start">
            <div className="w-fit max-w-[85%] rounded-lg bg-muted/50 px-3 py-2 text-sm text-stone-400">
              {status === "submitted"
                ? "Analyzing your request…"
                : "Creating designs…"}
            </div>
          </div>
        )}
      </div>

      <div className="w-full p-4">
        <form
          onSubmit={handleSend}
          className="w-full overflow-visible rounded-xl border border-border/60 shadow-none focus-within:ring-2 focus-within:ring-ring/30"
          style={{ backgroundColor: "#2e2726" }}
        >
          <PageMentionInput
            value={inputValue}
            onChange={setInputValue}
            pages={frames.map((f) => ({ id: f.id, label: f.label }))}
            placeholder="Describe what you want to create or change…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={status === "submitted" || status === "streaming"}
            className="text-sm"
          />
          <div className="flex items-center justify-end p-2">
            <button
              type="submit"
              disabled={
                !inputValue.trim() ||
                status === "submitted" ||
                status === "streaming"
              }
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
