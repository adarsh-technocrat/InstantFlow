"use client";

import { useState } from "react";
import { CodeDialog } from "@/components/CodeDialog";

function DragHandleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 256 256"
      className="size-4 shrink-0 text-white/70"
    >
      <path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60,12a12,12,0,1,0-12-12A12,12,0,0,0,164,72ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 256 256"
      className="size-3.5"
    >
      <path d="M69.12,94.15,28.5,128l40.62,33.85a8,8,0,1,1-10.24,12.29l-48-40a8,8,0,0,1,0-12.29l48-40a8,8,0,0,1,10.24,12.3Zm176,27.7-48-40a8,8,0,1,0-10.24,12.3L227.5,128l-40.62,33.85a8,8,0,1,0,10.24,12.29l48-40a8,8,0,0,0,0-12.29ZM162.73,32.48a8,8,0,0,0-10.25,4.79l-64,176a8,8,0,0,0,4.79,10.26A8.14,8.14,0,0,0,96,224a8,8,0,0,0,7.52-5.27l64-176A8,8,0,0,0,162.73,32.48Z" />
    </svg>
  );
}

function FigmaIcon() {
  return (
    <svg
      className="size-3.5"
      viewBox="0 0 200 300"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M50 300c27.6 0 50-22.4 50-50v-50H50c-27.6 0-50 22.4-50 50s22.4 50 50 50z"
        fill="#0acf83"
      />
      <path
        d="M0 150c0-27.6 22.4-50 50-50h50v100H50c-27.6 0-50-22.4-50-50z"
        fill="#a259ff"
      />
      <path
        d="M0 50C0 22.4 22.4 0 50 0h50v100H50C22.4 100 0 77.6 0 50z"
        fill="#f24e1e"
      />
      <path
        d="M100 0h50c27.6 0 50 22.4 50 50s-22.4 50-50 50h-50V0z"
        fill="#ff7262"
      />
      <path
        d="M200 150c0 27.6-22.4 50-50 50s-50-22.4-50-50 22.4-50 50-50 50 22.4 50 50z"
        fill="#1abcfe"
      />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 256 256"
      className="size-3.5"
    >
      <path d="M224,104a8,8,0,0,1-16,0V59.32l-66.33,66.34a8,8,0,0,1-11.32-11.32L196.68,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 256 256"
      className="size-3.5"
    >
      <path d="M240,136v64a16,16,0,0,1-16,16H32a16,16,0,0,1-16-16V136a16,16,0,0,1,16-16H72a8,8,0,0,1,0,16H32v64H224V136H184a8,8,0,0,1,0-16h40A16,16,0,0,1,240,136Zm-117.66-2.34a8,8,0,0,0,11.32,0l48-48a8,8,0,0,0-11.32-11.32L136,108.69V24a8,8,0,0,0-16,0v84.69L85.66,74.34A8,8,0,0,0,74.34,85.66ZM200,168a12,12,0,1,0-12,12A12,12,0,0,0,200,168Z" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 256 256"
      className="size-3.5"
    >
      <path d="M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm56-12a12,12,0,1,0,12,12A12,12,0,0,0,196,116ZM60,116a12,12,0,1,0,12,12A12,12,0,0,0,60,116Z" />
    </svg>
  );
}

const toolbarButtonClass =
  "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-sm font-medium text-white/90 outline-none transition-[color,box-shadow,scale] hover:bg-white/10 focus-visible:ring-[3px] focus-visible:ring-(--ring)/50 active:scale-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";

/** Desired gap between frame and toolbar in screen pixels (stays constant when zooming) */
const TOOLBAR_GAP_SCREEN_PX = 48;

export interface FrameToolbarProps {
  label: string;
  html?: string;
  scale?: number;
  canvasScale?: number;
}

export function FrameToolbar({
  label,
  html = "",
  scale = 1.76418,
  canvasScale = 0.556382,
}: FrameToolbarProps) {
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const topOffsetPx =
    canvasScale > 0 ? TOOLBAR_GAP_SCREEN_PX / canvasScale : 70;
  return (
    <div
      className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-md border border-white/10 bg-canvas-panel px-2 py-1 shadow-sm"
      style={{
        transform: `scale(${scale})`,
        top: `-${topOffsetPx}px`,
        transformOrigin: "center top",
      }}
    >
      <div className="flex cursor-grab items-center gap-1.5">
        <DragHandleIcon />
        <div className="min-w-18 flex flex-col gap-2 font-medium text-sm">
          <div
            className="relative inline-block min-w-0 cursor-default select-none truncate rounded border border-transparent py-0 text-sm text-white/90 hover:text-white/70"
            role="button"
            tabIndex={0}
          >
            {label}
          </div>
        </div>
      </div>
      <div className="h-4 w-px bg-white/20" />
      <div data-toolbar-buttons className="flex items-center gap-1">
        <button
          type="button"
          className={toolbarButtonClass}
          title="Code"
          onClick={(e) => {
            e.stopPropagation();
            setCodeDialogOpen(true);
          }}
        >
          <CodeIcon />
        </button>
        <button type="button" className={toolbarButtonClass} title="Figma">
          <FigmaIcon />
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          title="Open in new tab"
        >
          <ExternalLinkIcon />
        </button>
        <button type="button" className={toolbarButtonClass} title="Download">
          <DownloadIcon />
        </button>
        <div className="mx-1 h-4 w-px bg-white/20" />
        <button
          type="button"
          className={toolbarButtonClass}
          title="More options"
          aria-haspopup="menu"
        >
          <MoreIcon />
        </button>
      </div>
      <CodeDialog
        open={codeDialogOpen}
        onClose={() => setCodeDialogOpen(false)}
        title={label}
        code={html}
      />
    </div>
  );
}
