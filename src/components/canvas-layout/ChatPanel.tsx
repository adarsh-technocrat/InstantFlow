"use client";

import type React from "react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
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
import { Brain, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { CloseIcon, ImageIcon } from "@/lib/svg-icons";
import { PageMentionInput } from "./PageMentionInput";

interface ToolStep {
  toolCallId: string;
  toolName: string;
  state: "running" | "done" | "error";
  input?: { id?: string; name?: string };
}

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

  if (toolType === "classifyIntent")
    return isCalled ? "Understood intent" : "Understanding intent…";
  if (toolType === "planScreens")
    return isCalled ? "Planned screens" : "Planning screens…";
  if (toolType === "planStyle")
    return isCalled ? "Defined visual style" : "Defining visual style…";

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

/** JSON-serializable value for tool input/output. */
type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

interface MessagePart {
  type: string;
  text?: string;
  toolCallId?: string;
  toolName?: string;
  state?: string;
  input?: Record<string, JsonValue>;
}

const TOOL_STEP_PART_TYPE = "tool-step";

function toolStepsFromParts(
  parts: MessagePart[] | undefined,
): ToolStep[] | undefined {
  if (!parts?.length) return undefined;

  const steps: ToolStep[] = [];

  for (const p of parts) {
    if (p.type === TOOL_STEP_PART_TYPE) {
      steps.push({
        toolCallId: p.toolCallId ?? "",
        toolName: p.toolName ?? "tool",
        state: (p.state as ToolStep["state"]) ?? "done",
        input: p.input as { id?: string; name?: string } | undefined,
      });
      continue;
    }
    if (p.type?.startsWith("tool-") || p.type === "dynamic-tool") {
      const state =
        p.state === "output-available"
          ? ("done" as const)
          : p.state === "output-error" || p.state === "input-error"
            ? ("error" as const)
            : ("running" as const);
      const input: { id?: string; name?: string } = {};
      const raw = p.input as { id?: string; name?: string } | undefined;
      if (raw?.id) input.id = raw.id;
      if (raw?.name) input.name = raw.name;
      const toolName =
        p.toolName ?? (p.type?.startsWith("tool-") ? p.type.slice(5) : "");
      steps.push({
        toolCallId: p.toolCallId ?? "",
        toolName: toolName || "tool",
        state,
        input: Object.keys(input).length ? input : undefined,
      });
    }
  }

  return steps.length > 0 ? steps : undefined;
}

function addStepIfNew(prev: ToolStep[], step: ToolStep): ToolStep[] {
  if (prev.some((s) => s.toolCallId === step.toolCallId)) return prev;
  return [...prev, step];
}

function ToolStepChip({
  step,
  frames,
}: {
  step: ToolStep;
  frames: { id: string; label: string }[];
}) {
  const label = getToolDisplayLabel(
    step.toolName,
    frames,
    step.input,
    step.state === "done",
  );
  const finished = step.state === "done";

  return (
    <div
      className={`not-prose flex w-fit items-center gap-2 rounded-md border px-2 py-1 transition-all ${
        finished
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-[#8A87F8]/40 bg-[#8A87F8]/10"
      }`}
    >
      {finished ? (
        CheckIcon
      ) : (
        <span className="inline-block size-3.5 shrink-0 animate-pulse rounded-full bg-[#8A87F8]/80" />
      )}
      <span
        className={`font-mono text-[11px] uppercase tracking-wider ${
          finished ? "text-emerald-300" : "text-white/90"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function StreamingActivityIndicator() {
  return (
    <div className="flex w-full justify-start">
      <div className="w-fit max-w-[85%] rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
        <span className="inline-block animate-pulse bg-gradient-to-r from-stone-400 via-stone-200 to-stone-400 bg-[length:200%_100%] bg-clip-text text-transparent [animation-duration:1.5s] font-medium">
          Working…
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

function AssistantMessageContent({
  parts,
  frames,
  isStreaming,
  toolSteps = [],
}: {
  parts: MessagePart[];
  frames: { id: string; label: string }[];
  isStreaming?: boolean;
  toolSteps?: ToolStep[];
}) {
  const blocks: Array<
    { kind: "text"; text: string } | { kind: "reasoning"; text: string }
  > = [];

  for (const part of parts) {
    if (part.type === "text") {
      blocks.push({ kind: "text", text: part.text ?? "" });
    } else if (part.type === "reasoning") {
      blocks.push({ kind: "reasoning", text: part.text ?? "" });
    }
  }

  return (
    <div className="space-y-3">
      {toolSteps.length > 0 && (
        <div className="flex flex-col gap-2 shrink-0">
          {toolSteps.map((step) => (
            <ToolStepChip key={step.toolCallId} step={step} frames={frames} />
          ))}
        </div>
      )}
      {blocks.map((block, bi) =>
        block.kind === "text" ? (
          block.text ? (
            <div key={bi} className="chat-markdown">
              <ReactMarkdown components={markdownComponents}>
                {block.text}
              </ReactMarkdown>
            </div>
          ) : null
        ) : (
          <ReasoningBlock
            key={bi}
            text={block.text}
            isStreaming={isStreaming}
            isComplete={!isStreaming || bi < blocks.length - 1}
          />
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
  const [toolSteps, _setToolSteps] = useState<ToolStep[]>([]);
  const chatThreadRef = useRef<HTMLDivElement>(null);
  const selectedFrameIds = useAppSelector((s) => s.canvas.selectedFrameIds);
  const frames = useAppSelector((s) => s.canvas.frames);
  const theme = useAppSelector((s) => s.canvas.theme);
  const activeFrameLabel =
    selectedFrameIds.length === 1
      ? (frames.find((f) => f.id === selectedFrameIds[0])?.label ?? frameName)
      : frameName;

  const stateRef = useRef({ frames, theme });
  const toolStepsRef = useRef<ToolStep[]>([]);
  const [lastMessageToolSteps, setLastMessageToolSteps] = useState<ToolStep[]>(
    [],
  );

  const setToolSteps = useCallback(
    (updater: ToolStep[] | ((prev: ToolStep[]) => ToolStep[])) => {
      _setToolSteps((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        toolStepsRef.current = next;
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    stateRef.current = { frames, theme };
    latestCanvasState.frames = frames;
    latestCanvasState.theme = theme;
  }, [frames, theme]);

  const hasHydratedFromProject = useRef(false);

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
      interface DataPartEvent {
        type: string;
        toolCallId?: string;
        toolName?: string;
        input?: Record<string, JsonValue>;
        data?: {
          toolCallId: string;
          toolName: string;
          frame?: {
            id: string;
            label?: string;
            left?: number;
            top?: number;
            html?: string;
          };
          theme?: Record<string, string>;
          themeUpdates?: Record<string, string>;
        };
      }
      const ev = dataPart as DataPartEvent;

      const toolCallId = ev.toolCallId ?? ev.data?.toolCallId;
      const toolName = ev.toolName ?? ev.data?.toolName;

      if (ev.type === "tool-input-start" && toolCallId && toolName) {
        setToolSteps((prev) =>
          addStepIfNew(prev, { toolCallId, toolName, state: "running" }),
        );
        return;
      }
      if (ev.type === "tool-output-available" && toolCallId) {
        setToolSteps((prev) =>
          prev.map((s) =>
            s.toolCallId === toolCallId ? { ...s, state: "done" as const } : s,
          ),
        );
        return;
      }
      if (ev.type === "tool-input-available" && ev.toolCallId && ev.input) {
        const input = ev.input as { id?: string; name?: string };
        setToolSteps((prev) =>
          prev.map((s) =>
            s.toolCallId === ev.toolCallId
              ? { ...s, input: { id: input.id, name: input.name } }
              : s,
          ),
        );
        return;
      }

      // ─── Custom data events ──────────────────────────────────────────────
      if (!ev.data) return;
      const { data } = ev;

      if (ev.type === "data-tool-call-start") {
        setToolSteps((prev) =>
          addStepIfNew(prev, {
            toolCallId: data.toolCallId,
            toolName: data.toolName,
            state: "running",
          }),
        );
        if (data.toolName === "create_screen" && data.frame) {
          dispatch(
            addFrameWithId({
              id: data.frame.id,
              label: data.frame.label ?? "",
              left: data.frame.left ?? 0,
              top: data.frame.top ?? 0,
              html: data.frame.html ?? "",
            }),
          );
        }
        return;
      }

      if (ev.type === "data-tool-call-delta") {
        if (data.toolName === "create_screen" && data.frame) {
          const changes: { label?: string; html?: string } = {};
          if (data.frame.label !== undefined) changes.label = data.frame.label;
          if (data.frame.html !== undefined) changes.html = data.frame.html;
          if (Object.keys(changes).length > 0) {
            dispatch(updateFrame({ id: data.frame.id, changes }));
          }
          if (data.frame.label) {
            setToolSteps((prev) =>
              prev.map((s) =>
                s.toolCallId === data.toolCallId
                  ? { ...s, input: { ...s.input, name: data.frame!.label } }
                  : s,
              ),
            );
          }
        } else if (
          data.toolName === "update_screen" &&
          data.frame?.html !== undefined
        ) {
          dispatch(
            updateFrameHtml({ id: data.frame.id, html: data.frame.html }),
          );
        }
        return;
      }

      if (ev.type === "data-tool-call-end") {
        const endInput: { id?: string; name?: string } = {};
        if (data.frame?.id) endInput.id = data.frame.id;
        if (data.frame?.label) endInput.name = data.frame.label;
        setToolSteps((prev) =>
          prev.map((s) =>
            s.toolCallId === data.toolCallId
              ? {
                  ...s,
                  state: "done" as const,
                  input: { ...s.input, ...endInput },
                }
              : s,
          ),
        );
        if (data.toolName === "create_screen" && data.frame) {
          dispatch(
            addFrameWithId({
              id: data.frame.id,
              label: data.frame.label ?? "",
              left: data.frame.left ?? 0,
              top: data.frame.top ?? 0,
              html: data.frame.html ?? "",
            }),
          );
          dispatch(
            updateFrame({
              id: data.frame.id,
              changes: {
                label: data.frame.label,
                html: data.frame.html,
              },
            }),
          );
          if (data.frame.html && data.frame.html.length > 0) {
            fetch("/api/frames", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                frameId: data.frame.id,
                html: data.frame.html,
                label: data.frame.label,
                left: data.frame.left,
                top: data.frame.top,
              }),
            }).catch(() => {});
          }
        } else if (
          (data.toolName === "update_screen" ||
            data.toolName === "edit_screen") &&
          data.frame?.html !== undefined
        ) {
          dispatch(
            updateFrameHtml({ id: data.frame.id, html: data.frame.html }),
          );
          const frame = stateRef.current.frames.find(
            (f) => f.id === data.frame?.id,
          );
          fetch("/api/frames", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              frameId: data.frame.id,
              html: data.frame.html,
              label: frame?.label,
              left: frame?.left,
              top: frame?.top,
            }),
          }).catch(() => {});
        } else if (data.toolName === "update_theme" && data.themeUpdates) {
          dispatch(setTheme(data.themeUpdates));
        } else if (data.toolName === "build_theme" && data.theme) {
          dispatch(replaceTheme(data.theme));
        }
        return;
      }
    },
    onFinish: ({ messages: finishedMessages, isAbort, isError }) => {
      const stepsToPersist = toolStepsRef.current;
      setToolSteps([]);
      if (
        !isAbort &&
        !isError &&
        finishedMessages.length > 0 &&
        stepsToPersist.length > 0
      ) {
        setLastMessageToolSteps([...stepsToPersist]);
        const lastIdx = finishedMessages.length - 1;
        const lastMsg = finishedMessages[lastIdx];
        if (lastMsg?.role === "assistant") {
          const stepParts = stepsToPersist.map((s) => ({
            type: TOOL_STEP_PART_TYPE,
            toolCallId: s.toolCallId,
            toolName: s.toolName,
            state: s.state,
            input: s.input,
          }));
          const existingParts = (
            (lastMsg as { parts?: MessagePart[] }).parts ?? []
          ).filter((p) => p.type !== TOOL_STEP_PART_TYPE);
          const updated = [...finishedMessages];
          updated[lastIdx] = {
            ...lastMsg,
            parts: [...stepParts, ...existingParts],
          } as typeof lastMsg;
          setMessages(updated);
          fetch("/api/chat/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: updated }),
          }).catch(() => {});
          return;
        }
      } else {
        setLastMessageToolSteps([]);
      }
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
      setToolSteps([]);
      setLastMessageToolSteps([]);
      sendMessage({ text: inputValue.trim() });
      setInputValue("");
    },
    [inputValue, sendMessage, setToolSteps],
  );

  useEffect(() => {
    chatThreadRef.current?.scrollTo({
      top: chatThreadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, toolSteps]);

  if (!isVisible) return null;

  const isActivelyStreaming = status === "submitted" || status === "streaming";

  const lastMsg = messages[messages.length - 1];
  const lastMsgIsAssistant = lastMsg?.role === "assistant";

  const assistantBubbleAlreadyVisible =
    isActivelyStreaming && lastMsgIsAssistant;

  const showPendingBubble =
    isActivelyStreaming &&
    toolSteps.length > 0 &&
    !assistantBubbleAlreadyVisible;

  const lastMsgHasContent =
    lastMsgIsAssistant &&
    ((lastMsg.parts ?? []).some(
      (p) =>
        (p as MessagePart).type === "text" ||
        (p as MessagePart).type === "reasoning" ||
        (p as MessagePart).type?.startsWith?.("tool-") ||
        (p as MessagePart).type === "dynamic-tool",
    ) ||
      typeof (lastMsg as { content?: string }).content === "string");

  const showStreamingIndicator =
    isActivelyStreaming &&
    toolSteps.length === 0 &&
    !showPendingBubble &&
    !lastMsgHasContent;
  // ─────────────────────────────────────────────────────────────────────────────

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
              const isLastMessage = msgIndex === messages.length - 1;
              const stepsFromParts =
                msg.role === "assistant"
                  ? toolStepsFromParts(msg.parts as MessagePart[])
                  : undefined;

              const liveToolSteps =
                isLastMessage && isActivelyStreaming ? toolSteps : undefined;

              const fallbackPersisted =
                msg.role === "assistant" && isLastMessage
                  ? lastMessageToolSteps
                  : undefined;

              const stepsForMessage =
                liveToolSteps && liveToolSteps.length > 0
                  ? liveToolSteps
                  : (stepsFromParts ??
                    (fallbackPersisted?.length
                      ? fallbackPersisted
                      : undefined));

              const isStreamingLastAssistant =
                isLastMessage &&
                msg.role === "assistant" &&
                isActivelyStreaming;

              const hasVisibleContent =
                isStreamingLastAssistant ||
                msg.role !== "assistant" ||
                (msg.parts ?? []).some(
                  (p) =>
                    p.type === "text" ||
                    p.type === "reasoning" ||
                    (p as MessagePart).type?.startsWith?.("tool-") ||
                    (p as MessagePart).type === "dynamic-tool",
                ) ||
                typeof msg.content === "string" ||
                (stepsForMessage && stepsForMessage.length > 0);

              if (!hasVisibleContent) return null;

              return (
                <Fragment key={msg.id}>
                  <div
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
                              status === "streaming" && isLastMessage
                            }
                            toolSteps={stepsForMessage}
                          />
                        ) : typeof msg.content === "string" ? (
                          <div className="chat-markdown">
                            <ReactMarkdown components={markdownComponents}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        ) : stepsForMessage && stepsForMessage.length > 0 ? (
                          <AssistantMessageContent
                            parts={[]}
                            frames={frames}
                            isStreaming={
                              status === "streaming" && isLastMessage
                            }
                            toolSteps={stepsForMessage}
                          />
                        ) : isStreamingLastAssistant ? (
                          <span className="inline-block animate-pulse text-white/40 text-xs">
                            …
                          </span>
                        ) : null
                      ) : msg.role === "user" ? (
                        getUserMessageText(msg)
                      ) : null}
                    </div>
                  </div>
                </Fragment>
              );
            },
          )}

        {/*
         * ─── FIX: Pending assistant bubble ────────────────────────────────────
         * Rendered when tool steps are live but the AI SDK hasn't yet added an
         * assistant message to the `messages` array (this happens during the
         * planning phase: classifyIntent → planScreens → planStyle → build_theme
         * before any text streams in). Without this bubble the chips are
         * calculated but have nowhere to render, so nothing shows until refresh.
         */}
        {showPendingBubble && (
          <div className="flex w-full justify-start">
            <div className="w-full rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-stone-300">
              <AssistantMessageContent
                parts={[]}
                frames={frames}
                isStreaming={status === "streaming"}
                toolSteps={toolSteps}
              />
            </div>
          </div>
        )}

        {/* "Working…" spinner — only when no steps and no content yet */}
        {showStreamingIndicator && <StreamingActivityIndicator />}
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
            disabled={isActivelyStreaming}
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
              disabled={!inputValue.trim() || isActivelyStreaming}
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
