"use client";

import { useCallback, useEffect, useRef } from "react";

function writeDoc(iframe: HTMLIFrameElement | null, html: string) {
  if (!iframe?.contentDocument || !html) return;
  const doc = iframe.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();
}

export interface UseIframeBridgeOptions {
  onMessage?: (event: MessageEvent) => void;
}

export interface UseIframeBridgeReturn {
  writeContent: (html: string) => void;
  postToFrame: (message: object, targetOrigin?: string) => void;
  getWindow: () => Window | null;
  getDocument: () => Document | null;
}

export function useIframeBridge(
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
  options: UseIframeBridgeOptions = {},
): UseIframeBridgeReturn {
  const { onMessage } = options;
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const writeContent = useCallback(
    (html: string) => {
      writeDoc(iframeRef.current, html);
    },
    [iframeRef],
  );

  const postToFrame = useCallback(
    (message: object, targetOrigin = "*") => {
      const win = iframeRef.current?.contentWindow;
      if (win) win.postMessage(message, targetOrigin);
    },
    [iframeRef],
  );

  const getWindow = useCallback((): Window | null => {
    return iframeRef.current?.contentWindow ?? null;
  }, [iframeRef]);

  const getDocument = useCallback((): Document | null => {
    return iframeRef.current?.contentDocument ?? null;
  }, [iframeRef]);

  useEffect(() => {
    if (!onMessage) return;
    const handler = (event: MessageEvent) => {
      if (iframeRef.current?.contentWindow !== event.source) return;
      onMessageRef.current?.(event);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onMessage, iframeRef]);

  return {
    writeContent,
    postToFrame,
    getWindow,
    getDocument,
  };
}
