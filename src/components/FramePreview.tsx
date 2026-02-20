"use client";

import { useEffect, useMemo, useState } from "react";

export function FramePreview({
  frameId,
  html,
  allowInteraction = false,
}: {
  frameId: string;
  html: string;
  allowInteraction?: boolean;
}) {
  const cacheKey = useMemo(
    () => `${html.length}-${html.slice(0, 50).replace(/[^a-z0-9]/gi, "")}`,
    [html],
  );
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    fetch("/api/frames", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frameId, html }),
    })
      .then(() => setLoadKey((k) => k + 1))
      .catch((e) => console.error("Frame sync error:", e));
  }, [frameId, html]);

  const src = `/api/render?frameId=${encodeURIComponent(frameId)}&v=${encodeURIComponent(cacheKey)}&k=${loadKey}`;

  return (
    <iframe
      src={src}
      title="Canvas Frame"
      data-frame-id={frameId}
      sandbox="allow-scripts allow-same-origin"
      className={`size-full border-0 bg-white scrollbar-hide ${allowInteraction ? "pointer-events-auto" : "pointer-events-none"}`}
      style={{ overflow: "auto" }}
    />
  );
}
