"use client";

import { SectionalEditIcon } from "@/components/canvas-layout/icons";

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16V4a2 2 0 0 1 2-2h12" />
    </svg>
  );
}

function DeleteIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

interface SelectionToastProps {
  message: string;
  onCopy?: () => void;
  onDelete?: () => void;
}

export function SelectionToast({
  message,
  onCopy,
  onDelete,
}: SelectionToastProps) {
  const btnClass =
    "shrink-0 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-secondary/80 hover:text-foreground";

  return (
    <div className="flex w-[550px] max-w-[calc(100vw-32px)] items-center justify-between gap-2 rounded-xl bg-panel-glass p-2 duration-300 backdrop-blur-md">
      <div className="flex items-center justify-start gap-2">
        <SectionalEditIcon color="var(--foreground)" />
        <p className="text-sm font-normal text-foreground">{message}</p>
      </div>
      <div className="flex items-center gap-1">
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className={btnClass}
            title="Copy"
            aria-label="Copy"
          >
            <CopyIcon />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className={btnClass}
            title="Delete"
            aria-label="Delete"
          >
            <DeleteIcon />
          </button>
        )}
      </div>
    </div>
  );
}
