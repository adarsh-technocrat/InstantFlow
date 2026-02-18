"use client";

export function FramePreview({ html }: { html: string }) {
  return (
    <iframe
      srcDoc={html}
      title="Frame Preview"
      sandbox="allow-scripts allow-same-origin"
      className="pointer-events-none size-full border-0 bg-white"
      style={{ overflow: "auto" }}
    />
  );
}
