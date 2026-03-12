"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addFrameWithId,
  updateFrameHtml,
  updateFrame,
  setTheme,
  replaceTheme,
} from "@/store/slices/canvasSlice";
import { Brain, ChevronDown, CircleX } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { CloseIcon, ImageIcon } from "@/lib/svg-icons";
import { PageMentionInput } from "./PageMentionInput";

const latestCanvasState: {
  frames: {
    id: string;
    label: string;
    left: number;
    top: number;
    html: string;
  }[];
  theme: Record<string, string>;
} = { frames: [], theme: {} };

function getToolDisplayLabel(
  toolType: string,
  frames: { id: string; label: string }[],
  input?: { id?: string; name?: string },
  isCalled?: boolean,
): string {
  const toTitle = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

  if (toolType === "build_theme")
    return isCalled ? "Created theme" : "Creating theme…";
  if (toolType === "update_theme")
    return isCalled ? "Updated theme" : "Updating theme…";

  if (toolType === "create_screen" && input?.name) {
    return isCalled
      ? `Created ${toTitle(input.name)} screen`
      : `Creating ${toTitle(input.name)} screen…`;
  }
  if (toolType === "generate_image" && input?.id)
    return isCalled
      ? `Generated image ${input.id}`
      : `Generating image ${input.id}…`;

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
  id?: string;
  text?: string;
  state?: string;
  toolCallId?: string;
  input?: {
    id?: string;
    name?: string;
    screen_html?: string;
  };
  data?: {
    result?: unknown;
    status?: string;
    stepId?: string;
  };
}

interface PlanningStep {
  stepId: string;
  label: string;
  status: "pending" | "success" | "error";
}

const PLANNING_STEP_LABELS: Record<string, string> = {
  classifyIntent: "Understanding intent",
  planScreens: "Planning screens",
  planStyle: "Defining visual style",
};

function StepStatusIcon({ status }: { status: PlanningStep["status"] }) {
  if (status === "success") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        fill="currentColor"
        viewBox="0 0 256 256"
        className="size-3 shrink-0 text-emerald-400"
      >
        <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" />
      </svg>
    );
  }
  if (status === "error") {
    return <CircleX className="size-3 shrink-0 text-red-400" strokeWidth={2} />;
  }
  return (
    <span className="inline-block size-3 shrink-0 animate-pulse rounded-full bg-[#8A87F8]/70" />
  );
}

function StreamingActivityIndicator({
  steps,
  toolParts,
  frames,
}: {
  steps: PlanningStep[];
  toolParts: MessagePart[];
  frames: { id: string; label: string }[];
}) {
  const hasEvents = steps.length > 0 || toolParts.length > 0;

  return (
    <div className="flex w-full justify-start">
      <div className="w-fit max-w-[85%] rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
        {hasEvents && (
          <div className="flex flex-col gap-1.5 mb-2">
            {steps.map((step) => (
              <div key={step.stepId} className="flex items-center gap-2">
                <StepStatusIcon status={step.status} />
                <span
                  className={`font-mono text-[11px] tracking-wider ${
                    step.status === "success"
                      ? "text-emerald-300/80"
                      : step.status === "error"
                        ? "text-red-300/80"
                        : "text-white/60"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
            {toolParts.map((tool, ti) => (
              <ToolCallChip
                key={tool.toolCallId ?? ti}
                tool={tool}
                frames={frames}
              />
            ))}
          </div>
        )}
        <span className="inline-block animate-pulse bg-gradient-to-r from-stone-400 via-stone-200 to-stone-400 bg-[length:200%_100%] bg-clip-text text-transparent [animation-duration:1.5s] font-medium">
          Planning next move…
        </span>
      </div>
    </div>
  );
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
  const [manuallyToggled, setManuallyToggled] = useState(false);
  const expanded = manuallyToggled ? !isComplete : !!isStreaming && !isComplete;

  return (
    <div className="not-prose flex w-full flex-col transition-all">
      <button
        type="button"
        onClick={() => setManuallyToggled((v) => !v)}
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

function isToolPartType(type: string): boolean {
  return (
    type.startsWith("tool-") && type !== "tool-invocation" && type !== "tool"
  );
}

function extractToolName(partType: string): string {
  return partType.replace(/^tool-/, "");
}

function isToolFinished(state: string | undefined): boolean {
  return (
    state === "output-available" ||
    state === "output-error" ||
    state === "output-denied"
  );
}

function isToolErrored(state: string | undefined): boolean {
  return state === "output-error" || state === "output-denied";
}

function isToolInProgress(state: string | undefined): boolean {
  return (
    state === "input-streaming" ||
    state === "input-available" ||
    state === undefined
  );
}

function ToolCallChip({
  tool,
  frames,
}: {
  tool: MessagePart;
  frames: { id: string; label: string }[];
}) {
  const toolName = extractToolName(tool.type);
  const finished = isToolFinished(tool.state);
  const errored = isToolErrored(tool.state);
  const inProgress = isToolInProgress(tool.state);
  const label = getToolDisplayLabel(toolName, frames, tool.input, finished);

  return (
    <div
      className={`not-prose flex w-fit items-center gap-2 rounded-md border px-2 py-1 transition-all ${
        errored
          ? "border-red-500/40 bg-red-500/10"
          : finished
            ? "border-emerald-500/40 bg-emerald-500/10"
            : "border-[#8A87F8]/40 bg-[#8A87F8]/10"
      }`}
    >
      {errored ? (
        <CircleX className="size-3.5 shrink-0 text-red-400" strokeWidth={2} />
      ) : finished ? (
        CheckIcon
      ) : inProgress ? (
        <span className="inline-block size-3.5 shrink-0 animate-pulse rounded-full bg-[#8A87F8]/80" />
      ) : (
        <span className="inline-block size-3.5 shrink-0 rounded-full bg-white/40" />
      )}
      <span
        className={`font-mono text-[11px] uppercase tracking-wider ${
          errored
            ? "text-red-300"
            : finished
              ? "text-emerald-300"
              : "text-white/90"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function AssistantMessageContent({
  parts,
  frames,
  isStreaming,
  isLastStreamingMessage,
}: {
  parts: MessagePart[];
  frames: { id: string; label: string }[];
  isStreaming?: boolean;
  isLastStreamingMessage?: boolean;
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
    } else if (isToolPartType(part.type)) {
      if (isLastStreamingMessage) {
        i++;
        continue;
      }
      const toolGroup: MessagePart[] = [];
      while (i < parts.length && isToolPartType(parts[i].type)) {
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
          <div key={bi} className="flex flex-col gap-2">
            {block.tools.map((tool, ti) => (
              <ToolCallChip
                key={tool.toolCallId ?? ti}
                tool={tool}
                frames={frames}
              />
            ))}
          </div>
        ),
      )}
    </div>
  );
}

function getUserMessageText(msg: {
  content?: string;
  parts?: Array<{ type: string; text?: string }>;
}): string | null {
  if (typeof msg.content === "string") return msg.content;
  const textPart = msg.parts?.find((p) => p.type === "text" && p.text);
  return textPart?.text ?? null;
}

const CheckIcon = (
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
);

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

function ChatHistoryShimmer() {
  return (
    <div className="flex flex-col gap-4 p-2">
      <div className="flex justify-end">
        <div className="h-8 w-[60%] animate-pulse rounded-lg bg-white/[0.06]" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-6 w-[45%] animate-pulse rounded-lg bg-white/[0.04]" />
        <div
          className="h-6 w-[70%] animate-pulse rounded-lg bg-white/[0.04]"
          style={{ animationDelay: "75ms" }}
        />
        <div
          className="h-6 w-[55%] animate-pulse rounded-lg bg-white/[0.04]"
          style={{ animationDelay: "150ms" }}
        />
      </div>
      <div className="flex justify-end">
        <div
          className="h-8 w-[50%] animate-pulse rounded-lg bg-white/[0.06]"
          style={{ animationDelay: "200ms" }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <div
          className="h-6 w-[65%] animate-pulse rounded-lg bg-white/[0.04]"
          style={{ animationDelay: "250ms" }}
        />
        <div
          className="h-6 w-[40%] animate-pulse rounded-lg bg-white/[0.04]"
          style={{ animationDelay: "325ms" }}
        />
      </div>
    </div>
  );
}

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
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [planningSteps, setPlanningSteps] = useState<PlanningStep[]>([]);
  const chatThreadRef = useRef<HTMLDivElement>(null);
  const selectedFrameIds = useAppSelector((s) => s.canvas.selectedFrameIds);
  const frames = useAppSelector((s) => s.canvas.frames);
  const theme = useAppSelector((s) => s.canvas.theme);
  const activeFrameLabel =
    selectedFrameIds.length === 1
      ? (frames.find((f) => f.id === selectedFrameIds[0])?.label ?? frameName)
      : frameName;

  const stateRef = useRef({ frames, theme });
  useEffect(() => {
    stateRef.current = { frames, theme };
    latestCanvasState.frames = frames;
    latestCanvasState.theme = theme;
  }, [frames, theme]);
  const hasHydratedFromProject = useRef(false);

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
            if (data.payload.html && data.payload.html.length > 0) {
              fetch("/api/frames", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  frameId: data.payload.id,
                  html: data.payload.html,
                  label: data.payload.label,
                  left: data.payload.left,
                  top: data.payload.top,
                }),
              }).catch(() => {});
            }
          }
          break;
        case "updateHtml":
          if (data.payload?.id && data.payload?.html !== undefined) {
            dispatch(
              updateFrameHtml({ id: data.payload.id, html: data.payload.html }),
            );
            if (data.payload.html.length > 0) {
              const frame = stateRef.current.frames.find(
                (f) => f.id === data.payload?.id,
              );
              fetch("/api/frames", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  frameId: data.payload.id,
                  html: data.payload.html,
                  label: frame?.label,
                  left: frame?.left,
                  top: frame?.top,
                }),
              }).catch(() => {});
            }
          }
          break;
        case "updateFrame":
          if (data.payload?.id) {
            const changes: { label?: string; html?: string } = {};
            if (data.payload.label !== undefined)
              changes.label = data.payload.label;
            if (data.payload.html !== undefined)
              changes.html = data.payload.html;
            if (Object.keys(changes).length > 0) {
              dispatch(updateFrame({ id: data.payload.id, changes }));
              if (
                data.payload.html !== undefined &&
                data.payload.html.length > 0
              ) {
                const frame = stateRef.current.frames.find(
                  (f) => f.id === data.payload?.id,
                );
                fetch("/api/frames", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    frameId: data.payload.id,
                    html: data.payload.html,
                    label: frame?.label ?? data.payload.label,
                    left: frame?.left ?? data.payload.left,
                    top: frame?.top ?? data.payload.top,
                  }),
                }).catch(() => {});
              }
            }
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

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: (options) => ({
          body: {
            ...options.body,
            messages: options.messages,
            id: options.id,
            trigger: options.trigger,
            messageId: options.messageId,
            frames: latestCanvasState.frames,
            theme: latestCanvasState.theme,
          },
        }),
      }),
  );

  const { messages, setMessages, sendMessage, status } = useChat({
    transport,
    onData: (dataPart) => {
      const ev = dataPart as unknown as {
        type: string;
        data?: unknown;
        frame?: {
          id: string;
          label: string;
          left: number;
          top: number;
          html?: string;
        };
        theme?: Record<string, string>;
      };
      if (ev.type === "data-step-result") {
        const stepData = ev.data as { stepId?: string; status?: string };
        const id = stepData.stepId;
        if (!id) return;
        const isSuccess = stepData.status === "success";
        setPlanningSteps((prev) => {
          const existing = prev.find((s) => s.stepId === id);
          if (existing) {
            return prev.map((s) =>
              s.stepId === id
                ? {
                    ...s,
                    status: isSuccess
                      ? ("success" as const)
                      : ("error" as const),
                  }
                : s,
            );
          }
          return [
            ...prev,
            {
              stepId: id,
              label: PLANNING_STEP_LABELS[id] ?? id,
              status: isSuccess ? ("success" as const) : ("pending" as const),
            },
          ];
        });
        return;
      }
      if (ev.type === "data-step-start") {
        return;
      }
      if (ev.type === "data-frame-action" && ev.data) {
        handleFrameAction(ev.data as Parameters<typeof handleFrameAction>[0]);
        return;
      }
      if (ev.type === "create_screen_frame" && ev.frame) {
        const { frame } = ev;
        handleFrameAction({
          action: frame.html ? "updateFrame" : "add",
          payload: {
            id: frame.id,
            label: frame.label,
            left: frame.left,
            top: frame.top,
            html: frame.html ?? "",
          },
        });
        return;
      }
      if (ev.type === "tool-call-end") {
        if (ev.frame?.id && ev.frame?.html !== undefined) {
          handleFrameAction({
            action: "updateHtml",
            payload: { id: ev.frame.id, html: ev.frame.html },
          });
        }
        if (ev.theme && Object.keys(ev.theme).length > 0) {
          handleFrameAction({
            action: "replaceTheme",
            payload: { theme: ev.theme },
          });
        }
      }
    },
    onFinish: ({ messages: finishedMessages, isAbort, isError }) => {
      if (!isAbort && !isError && finishedMessages.length > 0) {
        fetch("/api/chat/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: finishedMessages }),
        }).catch(() => {});
      }
    },
  });

  useEffect(() => {
    if (hasHydratedFromProject.current) return;
    hasHydratedFromProject.current = true;
    fetch("/api/chat/sessions")
      .then((res) => res.json())
      .then((data: { messages?: UIMessage[] }) => {
        if (data?.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingHistory(false));
  }, [setMessages]);

  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (messages.length === 0 || status === "streaming") return;
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = setTimeout(() => {
      persistTimeoutRef.current = null;
      fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      }).catch(() => {});
    }, 1500);
    return () => {
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    };
  }, [messages, status]);

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
      setPlanningSteps([]);
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
  }, [messages, planningSteps]);

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
        {isLoadingHistory && <ChatHistoryShimmer />}
        {!isLoadingHistory &&
          messages.map(
            (
              msg: {
                id: string;
                role: string;
                parts?: Array<{
                  type: string;
                  text?: string;
                  state?: string;
                }>;
                content?: string;
              },
              msgIndex: number,
            ) => {
              const isChatActive =
                status === "submitted" || status === "streaming";
              const isLastMessage = msgIndex === messages.length - 1;
              const isLastStreaming = isChatActive && isLastMessage;
              const hasVisibleContent =
                msg.role !== "assistant" ||
                (msg.parts ?? []).some(
                  (p) =>
                    p.type === "text" ||
                    p.type === "reasoning" ||
                    (!isLastStreaming && isToolPartType(p.type)),
                ) ||
                typeof msg.content === "string";
              if (!hasVisibleContent) return null;
              return (
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
                          isStreaming={status === "streaming" && isLastMessage}
                          isLastStreamingMessage={isLastStreaming}
                        />
                      ) : typeof msg.content === "string" ? (
                        <div className="chat-markdown">
                          <ReactMarkdown components={markdownComponents}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : null
                    ) : msg.role === "user" ? (
                      getUserMessageText(msg)
                    ) : null}
                  </div>
                </div>
              );
            },
          )}
        {(status === "submitted" || status === "streaming") &&
          (() => {
            const lastMsg = messages[messages.length - 1];
            const lastToolParts =
              lastMsg?.role === "assistant"
                ? (lastMsg.parts ?? []).filter((p: { type: string }) =>
                    isToolPartType(p.type),
                  )
                : [];
            return (
              <StreamingActivityIndicator
                steps={planningSteps}
                toolParts={lastToolParts as MessagePart[]}
                frames={frames}
              />
            );
          })()}
      </div>

      <div className="w-full p-4">
        <form
          onSubmit={handleSend}
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
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
                handleSend();
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
