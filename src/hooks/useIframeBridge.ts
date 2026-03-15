"use client";

import { useCallback, useEffect, useRef } from "react";

function extractBody(html: string): string | null {
  const bodyOpen = html.indexOf("<body");
  if (bodyOpen === -1) return null;
  const bodyStart = html.indexOf(">", bodyOpen);
  if (bodyStart === -1) return null;
  const bodyClose = html.lastIndexOf("</body>");
  if (bodyClose === -1) return html.substring(bodyStart + 1);
  return html.substring(bodyStart + 1, bodyClose);
}

function writeDocFull(iframe: HTMLIFrameElement | null, html: string) {
  if (!iframe?.contentDocument || !html) return;
  const doc = iframe.contentDocument;
  const scrollTop = doc.documentElement?.scrollTop ?? 0;
  doc.open();
  doc.write(html);
  doc.close();
  if (scrollTop > 0) {
    requestAnimationFrame(() => {
      if (iframe.contentDocument?.documentElement) {
        iframe.contentDocument.documentElement.scrollTop = scrollTop;
      }
    });
  }
}

export interface UseIframeBridgeOptions {
  onMessage?: (event: MessageEvent) => void;
}

export interface UseIframeBridgeReturn {
  writeContent: (html: string, incremental?: boolean) => void;
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

  const hasWrittenRef = useRef(false);
  const lastWrittenHtmlRef = useRef("");

  const writeContent = useCallback(
    (html: string, incremental = false) => {
      const iframe = iframeRef.current;
      if (!iframe || !html) return;

      if (html === lastWrittenHtmlRef.current) return;
      lastWrittenHtmlRef.current = html;

      const doc = iframe.contentDocument;

      if (incremental && hasWrittenRef.current && doc?.body) {
        const newBody = extractBody(html);
        if (newBody !== null) {
          const scrollTop = doc.documentElement?.scrollTop ?? 0;
          requestAnimationFrame(() => {
            if (!iframe.contentDocument?.body) return;
            iframe.contentDocument.body.innerHTML = newBody;
            requestAnimationFrame(() => {
              if (iframe.contentDocument?.documentElement) {
                iframe.contentDocument.documentElement.scrollTop = scrollTop;
              }
            });
          });
          return;
        }
      }

      writeDocFull(iframe, html);
      hasWrittenRef.current = true;
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
