"use client";

/**
 * Renders HTML content inside an iframe for frame previews.
 * Uses srcdoc for Hot Module Replacement: when the html constant changes,
 * React re-renders with the new value and the iframe updates instantly.
 */
export function FramePreview({ html }: { html: string }) {
  return (
    <iframe
      srcDoc={html}
      title="Frame Preview"
      sandbox="allow-scripts allow-same-origin"
      className="size-full border-0 bg-white"
      style={{ overflow: "auto" }}
    />
  );
}
