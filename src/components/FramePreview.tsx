"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useIframeBridge } from "@/hooks/useIframeBridge";
import {
  injectFrameScripts,
  injectElementInspectorScript,
  truncatePartialHtml,
  looksLikeMalformedFrameContent,
} from "@/lib/screen-utils";

const LOADING_THRESHOLD = 50;
const POST_DEBOUNCE_MS = 2000;
const WRITE_THROTTLE_MS = 250;

const IFRAME_STYLE = { overflow: "auto" } as const;

export interface FramePreviewProps {
  frameId: string;
  html: string;
  label?: string;
  left?: number;
  top?: number;
  allowInteraction?: boolean;
  enableElementInspection?: boolean;
  iframeRef?: React.MutableRefObject<HTMLIFrameElement | null>;
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
    enableElementInspection = false,
    iframeRef: iframeRefProp,
    onMessageFromFrame,
  },
  ref,
) {
  const isStreaming = html.length < LOADING_THRESHOLD;
  const [_loadKey, setLoadKey] = useState(0);
  const [inspectorScript, setInspectorScript] = useState("");
  const hasFadedInRef = useRef(false);
  const internalRef = useRef<HTMLIFrameElement>(null);
  const postTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHtmlRef = useRef("");

  const { writeContent } = useIframeBridge(internalRef, {
    onMessage: onMessageFromFrame,
  });

  useEffect(() => {
    if (!enableElementInspection) return;
    fetch("/api/scripts/element-inspector")
      .then((r) => r.text())
      .then(setInspectorScript)
      .catch(() => {});
  }, [enableElementInspection]);

  const preparedHtml = useMemo(() => {
    if (!html) return "";
    if (looksLikeMalformedFrameContent(html)) return "";
    const safeHtml = truncatePartialHtml(html);
    if (!safeHtml) return "";
    let out = injectFrameScripts(safeHtml);
    if (enableElementInspection && inspectorScript) {
      out = injectElementInspectorScript(out, inspectorScript);
    }
    return out;
  }, [html, enableElementInspection, inspectorScript]);

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

  const injectedInspectorRef = useRef(false);
  useEffect(() => {
    if (!inspectorScript || injectedInspectorRef.current) return;
    const iframe = internalRef.current;
    const doc = iframe?.contentDocument;
    if (!doc?.body) return;
    const existing = doc.querySelector("script[data-inspector]");
    if (existing) return;
    injectedInspectorRef.current = true;
    const script = doc.createElement("script");
    script.setAttribute("data-inspector", "true");
    script.textContent = inspectorScript;
    doc.body.appendChild(script);
  }, [inspectorScript]);

  const prevHtmlLenRef = useRef(0);
  const lastWriteTimeRef = useRef(0);

  useEffect(() => {
    if (!preparedHtml) return;
    latestHtmlRef.current = preparedHtml;

    const doWrite = (incremental: boolean) => {
      lastWriteTimeRef.current = Date.now();
      const htmlToWrite = latestHtmlRef.current;
      writeContent(htmlToWrite, incremental);
    };

    const now = Date.now();
    const timeSinceLastWrite = now - lastWriteTimeRef.current;
    const htmlGrew = preparedHtml.length > prevHtmlLenRef.current;
    prevHtmlLenRef.current = preparedHtml.length;

    if (htmlGrew && timeSinceLastWrite < WRITE_THROTTLE_MS * 2) {
      if (writeTimeoutRef.current) return;
      writeTimeoutRef.current = setTimeout(() => {
        writeTimeoutRef.current = null;
        doWrite(true);
      }, WRITE_THROTTLE_MS);
    } else {
      if (writeTimeoutRef.current) {
        clearTimeout(writeTimeoutRef.current);
        writeTimeoutRef.current = null;
      }
      doWrite(false);
    }

    return () => {
      if (writeTimeoutRef.current) {
        clearTimeout(writeTimeoutRef.current);
        writeTimeoutRef.current = null;
      }
    };
  }, [preparedHtml, writeContent]);

  const setRef = useCallback(
    (el: HTMLIFrameElement | null) => {
      (
        internalRef as React.MutableRefObject<HTMLIFrameElement | null>
      ).current = el;
      if (iframeRefProp) iframeRefProp.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref)
        (ref as React.MutableRefObject<HTMLIFrameElement | null>).current = el;
    },
    [ref, iframeRefProp],
  );

  const handleIframeLoad = useCallback(() => {
    if (!latestHtmlRef.current) return;
    const htmlToWrite = latestHtmlRef.current;
    writeContent(htmlToWrite);
  }, [writeContent, isStreaming]);

  const isMalformed = looksLikeMalformedFrameContent(html);

  if (!html || html.length === 0 || isMalformed) {
    return (
      <div
        className="frame-preview-loading relative size-full overflow-hidden"
        data-frame-id={frameId}
      >
        <div className="absolute inset-0 frame-preview-gradient" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm text-white/50">
            {isMalformed ? "Regenerating…" : "Generating…"}
          </span>
        </div>
      </div>
    );
  }

  const showFadeIn = !isStreaming && !hasFadedInRef.current;
  if (showFadeIn) hasFadedInRef.current = true;

  const iframeClassName = [
    "size-full border-0 bg-white scrollbar-hide",
    showFadeIn && "frame-fade-in",
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
