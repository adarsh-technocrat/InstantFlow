"use client";

import { useEffect } from "react";

export function BrowserZoomBlocker() {
  useEffect(() => {
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", preventBrowserZoom, {
      passive: false,
      capture: true,
    });
    return () =>
      window.removeEventListener("wheel", preventBrowserZoom, {
        capture: true,
      });
  }, []);
  return null;
}
