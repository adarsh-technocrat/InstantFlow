"use client";

import { useEffect, useRef, useState } from "react";
import { injectFrameScripts } from "@/lib/screen-utils";

const LOADING_THRESHOLD = 50;
const POST_DEBOUNCE_MS = 50;

export function FramePreview({
  frameId,
  html,
  label,
  left,
  top,
  allowInteraction = false,
}: {
  frameId: string;
  html: string;
  label?: string;
  left?: number;
  top?: number;
  allowInteraction?: boolean;
}) {
  const isStreaming = html.length < LOADING_THRESHOLD;
  const [loadKey, setLoadKey] = useState(0);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const postTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        .then((r) => {
          setLoadKey((k) => k + 1);
        })
        .catch((e) => {});
    }, POST_DEBOUNCE_MS);
    return () => {
      if (postTimeoutRef.current) clearTimeout(postTimeoutRef.current);
    };
  }, [frameId, html, label, left, top, isStreaming]);

  useEffect(() => {
    if (isStreaming || html.length < LOADING_THRESHOLD) {
      setIframeSrc(null);
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      return;
    }
    const prepared = injectFrameScripts(html);
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const blob = new Blob([prepared], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;
    setIframeSrc(url);
    return () => {
      URL.revokeObjectURL(url);
      blobUrlRef.current = null;
    };
  }, [frameId, html, isStreaming]);

  if (isStreaming) {
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

  const handleLoad = () => {};

  if (!iframeSrc) {
    return (
      <div className="frame-preview-loading relative size-full overflow-hidden">
        <div className="absolute inset-0 frame-preview-gradient" />
      </div>
    );
  }

  return (
    <iframe
      key={`${frameId}-${html.length}`}
      src={iframeSrc}
      title="Canvas Frame"
      data-frame-id={frameId}
      sandbox="allow-scripts allow-same-origin"
      className={`size-full border-0 bg-white scrollbar-hide frame-fade-in ${allowInteraction ? "pointer-events-auto" : "pointer-events-none"}`}
      style={{ overflow: "auto" }}
      onLoad={handleLoad}
    />
  );
}
