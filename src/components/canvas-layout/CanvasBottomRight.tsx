"use client";

import { useCanvas } from "@/hooks/useCanvas";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCanvasToolMode, type CanvasToolMode } from "@/store/slices/uiSlice";

function ToolbarButton({
  children,
  disabled,
  title,
  onClick,
  selected,
  className = "",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-medium outline-none transition-[color,box-shadow,scale] focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4 " +
        (selected
          ? "bg-[#48413f] text-[#fafafa]"
          : "text-foreground hover:bg-secondary/80") +
        (className ? " " + className : "")
      }
    >
      {children}
    </button>
  );
}

export function CanvasBottomRight() {
  const { zoomPercent, zoomIn, zoomOut } = useCanvas();
  const dispatch = useAppDispatch();
  const canvasToolMode = useAppSelector((s) => s.ui.canvasToolMode);

  const setMode = (mode: CanvasToolMode) => () =>
    dispatch(setCanvasToolMode(mode));

  return (
    <div className="absolute bottom-4 right-4 z-10 flex w-auto flex-row items-center gap-2 rounded-xl bg-panel-glass p-2 backdrop-blur-md">
      <div className="flex items-center gap-1">
        <ToolbarButton
          title="Select"
          selected={canvasToolMode === "select"}
          onClick={setMode("select")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            fill="currentColor"
            viewBox="0 0 256 256"
          >
            <path d="M168,132.69,214.08,115l.33-.13A16,16,0,0,0,213,85.07L52.92,32.8A15.95,15.95,0,0,0,32.8,52.92L85.07,213a15.82,15.82,0,0,0,14.41,11l.78,0a15.84,15.84,0,0,0,14.61-9.59l.13-.33L132.69,168,184,219.31a16,16,0,0,0,22.63,0l12.68-12.68a16,16,0,0,0,0-22.63ZM195.31,208,144,156.69a16,16,0,0,0-26,4.93c0,.11-.09.22-.13.32l-17.65,46L48,48l159.85,52.2-45.95,17.64-.32.13a16,16,0,0,0-4.93,26h0L208,195.31Z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          title="Hand"
          selected={canvasToolMode === "hand"}
          onClick={setMode("hand")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            fill="currentColor"
            viewBox="0 0 256 256"
          >
            <path d="M188,48a27.75,27.75,0,0,0-12,2.71V44a28,28,0,0,0-54.65-8.6A28,28,0,0,0,80,60v64l-3.82-6.13a28,28,0,0,0-48.6,27.82c16,33.77,28.93,57.72,43.72,72.69C86.24,233.54,103.2,240,128,240a88.1,88.1,0,0,0,88-88V76A28,28,0,0,0,188,48Zm12,104a72.08,72.08,0,0,1-72,72c-20.38,0-33.51-4.88-45.33-16.85C69.44,193.74,57.26,171,41.9,138.58a6.36,6.36,0,0,0-.3-.58,12,12,0,0,1,20.79-12,1.76,1.76,0,0,0,.14.23l18.67,30A8,8,0,0,0,96,152V60a12,12,0,0,1,24,0v60a8,8,0,0,0,16,0V44a12,12,0,0,1,24,0v76a8,8,0,0,0,16,0V76a12,12,0,0,1,24,0Z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton disabled title="Undo">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            fill="currentColor"
            viewBox="0 0 256 256"
          >
            <path d="M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,197.8a8,8,0,0,1,11-11.63A80,80,0,1,0,71.43,71.39a3.07,3.07,0,0,1-.26.25L44.59,96H72a8,8,0,0,1,0,16H24a8,8,0,0,1-8-8V56a8,8,0,0,1,16,0V85.8L60.25,60A96,96,0,0,1,224,128Z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton disabled title="Redo">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            fill="currentColor"
            viewBox="0 0 256 256"
          >
            <path d="M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64l-.25-.24a80,80,0,1,0-1.67,114.78,8,8,0,0,1,11,11.63A95.44,95.44,0,0,1,128,224h-1.32A96,96,0,1,1,195.75,60L224,85.8V56a8,8,0,1,1,16,0Z" />
          </svg>
        </ToolbarButton>
      </div>
      <div className="h-4 w-px shrink-0 bg-border/60" role="none" />
      <div className="flex items-center">
        <ToolbarButton title="Zoom out" onClick={zoomOut}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            fill="currentColor"
            viewBox="0 0 256 256"
          >
            <path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128Z" />
          </svg>
        </ToolbarButton>
        <div className="min-w-10 text-center text-sm text-foreground">
          {zoomPercent}%
        </div>
        <ToolbarButton title="Zoom in" onClick={zoomIn}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            fill="currentColor"
            viewBox="0 0 256 256"
          >
            <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" />
          </svg>
        </ToolbarButton>
      </div>
    </div>
  );
}
