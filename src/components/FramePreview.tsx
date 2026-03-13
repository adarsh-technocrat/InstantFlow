"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useIframeBridge } from "@/hooks/useIframeBridge";
import { injectFrameScripts } from "@/lib/screen-utils";

const LOADING_THRESHOLD = 50;
const POST_DEBOUNCE_MS = 2000;
const WRITE_THROTTLE_MS = 120;

const IFRAME_STYLE = { overflow: "auto" } as const;

export interface FramePreviewProps {
  frameId: string;
  html: string;
  label?: string;
  left?: number;
  top?: number;
  allowInteraction?: boolean;
  onMessageFromFrame?: (event: MessageEvent) => void;
}

export const FramePreview = React.forwardRef<
  HTMLIFrameElement,
  FramePreviewProps
>(function FramePreview(
  {
    frameId,
    html,
    label,
    left,
    top,
    allowInteraction = false,
    onMessageFromFrame,
  },
  ref,
) {
  const isStreaming = html.length < LOADING_THRESHOLD;
  const [_loadKey, setLoadKey] = useState(0);
  const internalRef = useRef<HTMLIFrameElement>(null);
  const postTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHtmlRef = useRef("");

  const { writeContent } = useIframeBridge(internalRef, {
    onMessage: onMessageFromFrame,
  });

  const preparedHtml = useMemo(
    () => (html ? injectFrameScripts(html) : ""),
    [html],
  );

  useEffect(() => {
    if (!html || isStreaming) return;
    if (postTimeoutRef.current) clearTimeout(postTimeoutRef.current);
    postTimeoutRef.current = setTimeout(() => {
      postTimeoutRef.current = null;
      fetch("/api/frames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frameId, html, label, left, top }),
      })
        .then(() => setLoadKey((k) => k + 1))
        .catch(() => {});
    }, POST_DEBOUNCE_MS);
    return () => {
      if (postTimeoutRef.current) clearTimeout(postTimeoutRef.current);
    };
  }, [frameId, html, label, left, top, isStreaming]);

  useEffect(() => {
    if (!preparedHtml) return;
    latestHtmlRef.current = preparedHtml;

    const doWrite = () => writeContent(latestHtmlRef.current);

    if (!isStreaming) {
      if (writeTimeoutRef.current) {
        clearTimeout(writeTimeoutRef.current);
        writeTimeoutRef.current = null;
      }
      doWrite();
      return;
    }

    if (writeTimeoutRef.current) return;
    writeTimeoutRef.current = setTimeout(() => {
      writeTimeoutRef.current = null;
      doWrite();
    }, WRITE_THROTTLE_MS);

    return () => {
      if (writeTimeoutRef.current) {
        clearTimeout(writeTimeoutRef.current);
        writeTimeoutRef.current = null;
      }
    };
  }, [preparedHtml, isStreaming, writeContent]);

  const setRef = useCallback(
    (el: HTMLIFrameElement | null) => {
      (
        internalRef as React.MutableRefObject<HTMLIFrameElement | null>
      ).current = el;
      if (typeof ref === "function") ref(el);
      else if (ref)
        (ref as React.MutableRefObject<HTMLIFrameElement | null>).current = el;
    },
    [ref],
  );

  const handleIframeLoad = useCallback(() => {
    if (latestHtmlRef.current) writeContent(latestHtmlRef.current);
  }, [writeContent]);

  if (!html || html.length === 0) {
    return (
      <div
        className="frame-preview-loading relative size-full overflow-hidden"
        data-frame-id={frameId}
      >
        <div className="absolute inset-0 frame-preview-gradient" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm text-white/50">Generating…</span>
        </div>
      </div>
    );
  }

  const iframeClassName = [
    "size-full border-0 bg-white scrollbar-hide",
    !isStreaming && "frame-fade-in",
    allowInteraction ? "pointer-events-auto" : "pointer-events-none",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <iframe
      ref={setRef}
      title="Canvas Frame"
      data-frame-id={frameId}
      sandbox="allow-scripts allow-same-origin"
      className={iframeClassName}
      style={IFRAME_STYLE}
      srcDoc=""
      onLoad={handleIframeLoad}
    />
  );
});
