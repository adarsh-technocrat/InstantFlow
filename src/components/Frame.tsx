export const PHONE_CLIP_PATH =
  'path("M 334 0 c 45.255 0 67.882 0 81.941 14.059 c 14.059 14.059 14.059 36.686 14.059 81.941 L 430 1024 c 0 45.255 0 67.882 -14.059 81.941 c -14.059 14.059 -36.686 14.059 -81.941 14.059 L 96 1120 c -45.255 0 -67.882 0 -81.941 -14.059 c -14.059 -14.059 -14.059 -36.686 -14.059 -81.941 L 0 96 c 0 -45.255 0 -67.882 14.059 -81.941 c 14.059 -14.059 36.686 -14.059 81.941 -14.059 Z")';

const FRAME_WIDTH = 430;
const FRAME_HEIGHT = 1120;

function DragHandleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 256 256"
      className="size-4 shrink-0"
    >
      <path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60,12a12,12,0,1,0-12-12A12,12,0,0,0,164,72ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z" />
    </svg>
  );
}

export interface FrameProps {
  /** Display label above the frame (e.g. screen name) */
  label: string;
  /** Horizontal position in px (relative to canvas transform origin) */
  left: number;
  /** Vertical position in px (default: -500) */
  top?: number;
  /** Optional content to render inside the phone screen. Defaults to a placeholder. */
  children?: React.ReactNode;
}

export function Frame({ label, left, top = -500, children }: FrameProps) {
  return (
    <div
      className="absolute"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
      }}
    >
      {/* Phone shape (clipped container) */}
      <div
        className="absolute isolate size-full overflow-hidden"
        style={{
          transform: "translateZ(0px)",
          backfaceVisibility: "hidden",
          clipPath: PHONE_CLIP_PATH,
        }}
      >
        {children ?? (
          <div
            className="size-full bg-white dark:bg-zinc-900"
            title="Canvas Frame"
          />
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 z-40" />
      {/* Frame label */}
      <div
        className="absolute left-0 flex items-center gap-3 truncate whitespace-nowrap text-sm"
        style={{
          transform: "scale(1.79733)",
          top: "-53.9198px",
          transformOrigin: "left top",
        }}
      >
        <div
          className="flex cursor-grab items-center gap-1 truncate"
          style={{ width: 239.244 }}
        >
          <DragHandleIcon />
          <div className="min-w-18 flex flex-1 flex-col gap-2 truncate">
            <div
              className="relative inline-block min-w-0 cursor-default select-none truncate rounded border border-transparent py-0 text-sm hover:text-(--foreground-muted)"
              role="button"
              tabIndex={0}
            >
              {label}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
