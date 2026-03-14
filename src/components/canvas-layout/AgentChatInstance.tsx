"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addFrameWithId,
  updateFrameHtml,
  updateFrame,
  setTheme,
  replaceTheme,
} from "@/store/slices/canvasSlice";
import {
  updateAgentStatus,
  updateAgentActiveFrame,
} from "@/store/slices/agentSlice";

const FRAME_HTML_THROTTLE_MS = 300;

type PendingHtml = Map<string, string>;

let pendingHtmlUpdates: PendingHtml = new Map();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let dispatchRef: ReturnType<typeof useAppDispatch> | null = null;

function scheduleHtmlFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    const batch = pendingHtmlUpdates;
    pendingHtmlUpdates = new Map();
    if (!dispatchRef) return;
    for (const [id, html] of batch) {
      dispatchRef(updateFrameHtml({ id, html }));
    }
  }, FRAME_HTML_THROTTLE_MS);
}

function enqueueHtmlUpdate(id: string, html: string) {
  pendingHtmlUpdates.set(id, html);
  scheduleHtmlFlush();
}

function flushHtmlUpdatesNow() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const batch = pendingHtmlUpdates;
  pendingHtmlUpdates = new Map();
  if (!dispatchRef) return;
  for (const [id, html] of batch) {
    dispatchRef(updateFrameHtml({ id, html }));
  }
}
import type { AgentInstance } from "@/store/slices/agentSlice";
import ReactMarkdown from "react-markdown";
import { Brain, ChevronDown } from "lucide-react";

interface ToolStep {
  toolCallId: string;
  toolName: string;
  state: "running" | "done" | "error";
  input?: { id?: string; name?: string };
}

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
  if (toolType === "create_all_screens") {
    return isCalled ? "Created all screens" : "Creating all screens…";
  }
  if (
    input?.id &&
    (toolType === "read_screen" ||
      toolType === "update_screen" ||
      toolType === "edit_design" ||
      toolType === "design_screen")
  ) {
    const frame = frames.find((f) => f.id === input.id);
    const label = frame?.label ?? "Screen";
    const name = toTitle(label);
    if (toolType === "read_screen")
      return isCalled ? `Read ${name} screen` : `Reading ${name} screen…`;
    if (toolType === "edit_design")
      return isCalled ? `Edited ${name} screen` : `Editing ${name} screen…`;
    if (toolType === "update_screen")
      return isCalled ? `Updated ${name} screen` : `Updating ${name} screen…`;
    if (toolType === "design_screen")
      return isCalled ? `Designed ${name} screen` : `Designing ${name} screen…`;
  }
  const base = toTitle(toolType.replace(/_/g, " "));
  return isCalled ? base : `${base}…`;
}

function addStepIfNew(prev: ToolStep[], step: ToolStep): ToolStep[] {
  if (prev.some((s) => s.toolCallId === step.toolCallId)) return prev;
  return [...prev, step];
}

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

function ToolStepChip({
  step,
  frames,
  agentColor,
}: {
  step: ToolStep;
  frames: { id: string; label: string }[];
  agentColor: string;
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
          : "border-white/20 bg-white/5"
      }`}
      style={
        !finished
          ? {
              borderColor: `${agentColor}40`,
              backgroundColor: `${agentColor}10`,
            }
          : undefined
      }
    >
      {finished ? (
        CheckIcon
      ) : (
        <span
          className="inline-block size-3.5 shrink-0 animate-pulse rounded-full"
          style={{ backgroundColor: `${agentColor}CC` }}
        />
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
};

function ReasoningBlock({
  text,
  isStreaming,
  isComplete,
}: {
  text: string;
  isStreaming?: boolean;
  isComplete?: boolean;
}) {
  const defaultExpanded = !!isStreaming && !isComplete;
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const expanded = userExpanded !== null ? userExpanded : defaultExpanded;
  return (
    <div className="not-prose flex w-full flex-col transition-all">
      <button
        type="button"
        onClick={() => setUserExpanded(!expanded)}
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

type StreamOrderItem =
  | { kind: "tool"; toolCallId: string }
  | { kind: "reasoning"; text: string }
  | { kind: "text"; text: string };

function AssistantMessageContent({
  parts,
  frames,
  isStreaming,
  toolSteps = [],
  agentColor,
}: {
  parts: MessagePart[];
  frames: { id: string; label: string }[];
  isStreaming?: boolean;
  toolSteps?: ToolStep[];
  agentColor: string;
}) {
  const stepByCallId = new Map(
    (toolSteps ?? []).map((s) => [s.toolCallId, s] as const),
  );
  const seenToolIds = new Set<string>();
  const ordered: StreamOrderItem[] = [];

  for (const part of parts) {
    if (part.type === "step-start" || part.type?.startsWith("data-")) continue;
    if (part.type === "text") {
      ordered.push({ kind: "text", text: part.text ?? "" });
    } else if (part.type === "reasoning") {
      ordered.push({ kind: "reasoning", text: part.text ?? "" });
    } else if (
      (part.type?.startsWith("tool-") || part.type === "dynamic-tool") &&
      part.toolCallId &&
      !seenToolIds.has(part.toolCallId)
    ) {
      seenToolIds.add(part.toolCallId);
      ordered.push({ kind: "tool", toolCallId: part.toolCallId });
    }
  }

  return (
    <div className="space-y-3">
      {ordered.map((item, i) => {
        if (item.kind === "tool") {
          const step = stepByCallId.get(item.toolCallId);
          if (!step) return null;
          return (
            <div
              key={`${item.toolCallId}-${i}`}
              className="flex flex-col gap-2 shrink-0"
            >
              <ToolStepChip
                step={step}
                frames={frames}
                agentColor={agentColor}
              />
            </div>
          );
        }
        if (item.kind === "reasoning") {
          return (
            <ReasoningBlock
              key={`reasoning-${i}`}
              text={item.text}
              isStreaming={isStreaming}
              isComplete={
                !isStreaming ||
                ordered.slice(i + 1).some((x) => x.kind === "reasoning")
              }
            />
          );
        }
        return item.text ? (
          <div key={`text-${i}`} className="chat-markdown">
            <ReactMarkdown components={markdownComponents}>
              {item.text}
            </ReactMarkdown>
          </div>
        ) : null;
      })}
    </div>
  );
}

interface AgentChatInstanceProps {
  agent: AgentInstance;
  isActive: boolean;
  planContext: string;
  onCanvasUpdate?: () => void;
}

export function AgentChatInstance({
  agent,
  isActive,
  planContext,
}: AgentChatInstanceProps) {
  const dispatch = useAppDispatch();
  const frames = useAppSelector((s) => s.canvas.frames);
  const theme = useAppSelector((s) => s.canvas.theme);
  dispatchRef = dispatch;

  const stateRef = useRef({ frames, theme });
  const toolStepsRef = useRef<ToolStep[]>([]);

  const [toolSteps, _setToolSteps] = useState<ToolStep[]>([]);
  const [lastMessageToolSteps, setLastMessageToolSteps] = useState<ToolStep[]>(
    [],
  );
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [frames, theme]);

  const isFirstAgent = agent.id === "0";

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
            frames: stateRef.current.frames,
            theme: stateRef.current.theme,
            agentId: agent.id,
            agentName: agent.name,
            subTask: agent.subTask,
            assignedScreens: agent.assignedScreens,
            assignedFrameIds: agent.assignedFrameIds,
            screenPositions: agent.screenPositions,
            isFirstAgent,
            planContext,
          },
        }),
      }),
  );

  const { messages, setMessages, sendMessage, status } = useChat({
    id: agent.chatId,
    transport,
    onData: (dataPart) => {
      interface DataPartEvent {
        type: string;
        toolCallId?: string;
        toolName?: string;
        input?: Record<string, JsonValue>;
        output?: JsonValue;
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
        flushHtmlUpdatesNow();
        const output = ev.output as
          | {
              frame?: {
                id: string;
                label?: string;
                left?: number;
                top?: number;
                html?: string;
              };
              theme?: Record<string, string>;
              themeUpdates?: Record<string, string>;
            }
          | undefined;
        setToolSteps((prev) =>
          prev.map((s) =>
            s.toolCallId === toolCallId ? { ...s, state: "done" as const } : s,
          ),
        );
        if (output?.frame) {
          const f = output.frame;
          const isCreate =
            f.id &&
            (f.left !== undefined || f.top !== undefined) &&
            f.html !== undefined;
          if (isCreate) {
            dispatch(
              addFrameWithId({
                id: f.id,
                label: f.label ?? "",
                left: f.left ?? 0,
                top: f.top ?? 0,
                html: f.html ?? "",
              }),
            );
            dispatch(
              updateFrame({
                id: f.id,
                changes: { label: f.label, html: f.html },
              }),
            );
            if (f.html && f.html.length > 0) {
              fetch("/api/frames", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  frameId: f.id,
                  html: f.html,
                  label: f.label,
                  left: f.left,
                  top: f.top,
                }),
              }).catch(() => {});
            }
          } else if (f.id && f.html !== undefined) {
            dispatch(updateFrameHtml({ id: f.id, html: f.html }));
            const frame = stateRef.current.frames.find((x) => x.id === f.id);
            fetch("/api/frames", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                frameId: f.id,
                html: f.html,
                label: frame?.label,
                left: frame?.left,
                top: frame?.top,
              }),
            }).catch(() => {});
          }
        }
        if (output?.themeUpdates) {
          dispatch(setTheme(output.themeUpdates));
        }
        if (output?.theme) {
          dispatch(replaceTheme(output.theme));
        }
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
        return;
      }

      if (ev.type === "data-tool-call-delta") {
        if (
          (data.toolName === "design_screen" ||
            data.toolName === "update_screen") &&
          data.frame?.html !== undefined
        ) {
          enqueueHtmlUpdate(data.frame.id, data.frame.html);
          if (data.toolName === "design_screen") {
            dispatch(
              updateAgentActiveFrame({
                id: agent.id,
                frameId: data.frame.id,
              }),
            );
          }
        }
        return;
      }

      if (ev.type === "data-tool-call-end") {
        flushHtmlUpdatesNow();
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
        if (
          (data.toolName === "update_screen" ||
            data.toolName === "edit_design" ||
            data.toolName === "design_screen") &&
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
      if (!isAbort && !isError && stepsToPersist.length > 0) {
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
            body: JSON.stringify({
              messages: updated,
              agentId: agent.chatId,
            }),
          }).catch(() => {});
        }
      } else {
        setLastMessageToolSteps([]);
        if (!isAbort && !isError && finishedMessages.length > 0) {
          fetch("/api/chat/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: finishedMessages,
              agentId: agent.chatId,
            }),
          }).catch(() => {});
        }
      }
      dispatch(
        updateAgentStatus({
          id: agent.id,
          status: isError ? "error" : "done",
        }),
      );
      dispatch(updateAgentActiveFrame({ id: agent.id, frameId: null }));
    },
  });

  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;
  const hasHydrated = useRef(false);

  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;

    console.log(
      `[Agent ${agent.name}] mount — chatId=${agent.chatId}, subTask="${agent.subTask.slice(0, 60)}…"`,
    );

    const agentKey = agent.chatId;
    fetch(`/api/chat/sessions?agentId=${encodeURIComponent(agentKey)}`)
      .then((res) => res.json())
      .then((data: { messages?: typeof messages }) => {
        console.log(
          `[Agent ${agent.name}] session fetch result:`,
          data?.messages?.length ?? 0,
          "messages",
        );
        if (data?.messages && data.messages.length > 0) {
          console.log(
            `[Agent ${agent.name}] restoring persisted history, marking done`,
          );
          setMessages(data.messages);
          const lastAssistant = [...data.messages]
            .reverse()
            .find((m) => m.role === "assistant");
          if (lastAssistant) {
            const restored = toolStepsFromParts(
              (lastAssistant as { parts?: MessagePart[] }).parts,
            );
            if (restored?.length) setLastMessageToolSteps(restored);
          }
          if (agent.status === "idle") {
            dispatch(updateAgentStatus({ id: agent.id, status: "done" }));
          }
        } else {
          const delay = parseInt(agent.id) * 500;
          console.log(
            `[Agent ${agent.name}] no history — will auto-send in ${delay}ms`,
          );
          const timer = setTimeout(() => {
            console.log(`[Agent ${agent.name}] AUTO-SENDING sub-task now`);
            dispatch(updateAgentStatus({ id: agent.id, status: "working" }));
            sendMessageRef.current({ text: agent.subTask });
          }, delay);
          return () => clearTimeout(timer);
        }
      })
      .catch((err) => {
        console.warn(
          `[Agent ${agent.name}] session fetch error, falling back to auto-send`,
          err,
        );
        const delay = parseInt(agent.id) * 500;
        const timer = setTimeout(() => {
          console.log(
            `[Agent ${agent.name}] AUTO-SENDING (fallback) sub-task now`,
          );
          dispatch(updateAgentStatus({ id: agent.id, status: "working" }));
          sendMessageRef.current({ text: agent.subTask });
        }, delay);
        cleanupTimerRef.current = timer;
      });

    return () => {
      if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (messages.length === 0 || status === "streaming") return;
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = setTimeout(() => {
      persistTimeoutRef.current = null;
      fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          agentId: agent.chatId,
        }),
      }).catch(() => {});
    }, 1500);
    return () => {
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    };
  }, [messages, status, agent.name]);

  const chatThreadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;
    chatThreadRef.current?.scrollTo({
      top: chatThreadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, toolSteps, isActive]);

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
      (typeof (lastMsg as { content?: string }).content === "string" &&
        ((lastMsg as { content?: string }).content ?? "").trim().length > 0));

  const showStreamingIndicator =
    isActivelyStreaming &&
    toolSteps.length === 0 &&
    !showPendingBubble &&
    !lastMsgHasContent;

  return (
    <div
      className="flex h-full flex-col"
      style={{ display: isActive ? "flex" : "none" }}
    >
      <div
        ref={chatThreadRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto scrollbar-hide p-2"
      >
        {messages.map(
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
                  (fallbackPersisted?.length ? fallbackPersisted : undefined));

            const isStreamingLastAssistant =
              isLastMessage && msg.role === "assistant" && isActivelyStreaming;

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
                          isStreaming={status === "streaming" && isLastMessage}
                          toolSteps={stepsForMessage}
                          agentColor={agent.color}
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
                          isStreaming={status === "streaming" && isLastMessage}
                          toolSteps={stepsForMessage}
                          agentColor={agent.color}
                        />
                      ) : isStreamingLastAssistant ? (
                        <span className="inline-block animate-pulse text-white/40 text-xs">
                          …
                        </span>
                      ) : null
                    ) : msg.role === "user" ? (
                      typeof msg.content === "string" ? (
                        msg.content
                      ) : (
                        (msg.parts?.find((p) => p.type === "text" && p.text)
                          ?.text ?? null)
                      )
                    ) : null}
                  </div>
                </div>
              </Fragment>
            );
          },
        )}

        {showPendingBubble && (
          <div className="flex w-full justify-start">
            <div className="w-full rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-stone-300">
              <AssistantMessageContent
                parts={[]}
                frames={frames}
                isStreaming={status === "streaming"}
                toolSteps={toolSteps}
                agentColor={agent.color}
              />
            </div>
          </div>
        )}

        {showStreamingIndicator && (
          <div className="flex w-full justify-start">
            <div className="w-fit max-w-[85%] rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
              <span
                className="inline-block animate-pulse bg-clip-text text-transparent font-medium [animation-duration:1.5s]"
                style={{
                  backgroundImage: `linear-gradient(to right, ${agent.color}80, ${agent.color}, ${agent.color}80)`,
                  backgroundSize: "200% 100%",
                }}
              >
                Working…
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
