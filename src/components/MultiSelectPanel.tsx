"use client";

export interface SelectedFrameInfo {
  id: string;
  label: string;
}

export interface MultiSelectPanelProps {
  selectedFrames: SelectedFrameInfo[];
  onRemoveFromSelection: (id: string) => void;
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 256 256"
      className="size-4"
    >
      <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 256 256"
      className="size-4"
    >
      <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 256 256"
      className="size-4"
    >
      <path d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z" />
    </svg>
  );
}

const secondaryButtonClass =
  "inline-flex size-8 shrink-0 items-center justify-center gap-2 rounded-md bg-secondary text-secondary-foreground shadow-xs font-medium text-sm outline-none transition-[color,box-shadow,scale] hover:bg-secondary/80 focus-visible:ring-[3px] focus-visible:ring-(--ring)/50 active:scale-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";

export function MultiSelectPanel({
  selectedFrames,
  onRemoveFromSelection,
}: MultiSelectPanelProps) {
  const count = selectedFrames.length;
  const label =
    count === 0
      ? "No screens selected"
      : count === 1
        ? "1 screen selected"
        : `${count} screens selected`;

  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-50 flex w-96 flex-col gap-4 rounded-lg border bg-background p-4 shadow-md">
      <div className="flex items-center gap-2">
        <span className="flex-1 font-medium">{label}</span>
        <button
          type="button"
          className={secondaryButtonClass}
          title="Copy"
          disabled={count === 0}
        >
          <CopyIcon />
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          title="Delete"
          disabled={count === 0}
        >
          <DeleteIcon />
        </button>
      </div>
      <p className="text-sm text-(--foreground-muted)">
        Hold{" "}
        <kbd className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-xs text-secondary-foreground">
          ⌘
        </kbd>{" "}
        and click screens to add or remove from selection. Hold{" "}
        <kbd className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-xs text-secondary-foreground">
          Space
        </kbd>{" "}
        and drag to pan.
      </p>
      <div className="flex max-h-[280px] flex-col gap-1 overflow-y-auto">
        {count === 0 ? (
          <p className="py-2 text-sm text-(--muted-foreground)">
            Drag on canvas to marquee-select screens.
          </p>
        ) : (
          selectedFrames.map((frame) => (
            <div
              key={frame.id}
              className="group flex cursor-default items-center gap-2 rounded-md border border-transparent bg-(--accent) px-2 py-1.5 transition-colors hover:border-border hover:bg-muted/50"
            >
              <span className="flex-1 truncate text-sm">{frame.label}</span>
              <button
                type="button"
                aria-label={`Remove ${frame.label} from selection`}
                className="text-(--muted-foreground) opacity-0 transition-all hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                onClick={() => onRemoveFromSelection(frame.id)}
              >
                <CloseIcon />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
