"use client";

import { createPortal } from "react-dom";
import { useRef, useEffect, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Code2,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import type { SelectedElement } from "@/components/frame/element-inspection/types";

const COMMON_FONTS = [
  "sans-serif",
  "serif",
  "monospace",
  "system-ui",
  "Inter",
  "Roboto",
  "Poppins",
  "Georgia",
];

function parseFontSize(fontSize: string): number {
  if (!fontSize) return 16;
  const match = fontSize.trim().match(/^([\d.]+)px$/i);
  return match ? Math.round(parseFloat(match[1])) : 16;
}

const btnBase =
  "w-8 h-8 flex items-center justify-center rounded-md text-xs transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A87F8]";
const btnActive = "bg-[#8A87F8] text-white hover:bg-[#7674d6]";
const btnInactive = "text-white/60 hover:bg-white/10 hover:text-white/90";

export interface FrameElementToolbarProps {
  selectedElement: SelectedElement;
  elementClasses: string[];
  showTailwindMenu: boolean;
  setShowTailwindMenu: (show: boolean) => void;
  newClassInput: string;
  setNewClassInput: (value: string) => void;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleUnderline: () => void;
  onToggleStrikethrough: () => void;
  onSetAlignLeft: () => void;
  onSetAlignCenter: () => void;
  onSetAlignRight: () => void;
  onSetAlignJustify?: () => void;
  onAddClass: (className: string) => void;
  onRemoveClass: (className: string) => void;
  onSetColor?: (color: string) => void;
  onSetFontSize?: (size: number) => void;
  onSetFontFamily?: (fontFamily: string) => void;
  onDeleteElement?: () => void;
  onApplyStyle?: (styles: Record<string, string>) => void;
  zoom?: number;
  overlayRef?: React.RefObject<HTMLDivElement | null>;
}

export default function FrameElementToolbar({
  selectedElement,
  elementClasses,
  showTailwindMenu,
  setShowTailwindMenu,
  newClassInput,
  setNewClassInput,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
  onToggleStrikethrough,
  onSetAlignLeft,
  onSetAlignCenter,
  onSetAlignRight,
  onSetAlignJustify,
  onAddClass,
  onRemoveClass,
  onSetColor,
  onSetFontSize,
  onSetFontFamily,
  onDeleteElement,
  onApplyStyle,
  zoom = 1,
  overlayRef,
}: FrameElementToolbarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!selectedElement) return null;

  const hasBold = elementClasses.some(
    (c) =>
      c.includes("font-bold") ||
      c.includes("font-semibold") ||
      c.includes("font-extrabold"),
  );
  const hasItalic = elementClasses.some((c) => c.includes("italic"));
  const hasUnderline = elementClasses.some((c) => c.includes("underline"));
  const hasStrikethrough = elementClasses.some((c) =>
    c.includes("line-through"),
  );
  const alignLeft = elementClasses.some((c) => c.includes("text-left"));
  const alignCenter = elementClasses.some((c) => c.includes("text-center"));
  const alignRight = elementClasses.some((c) => c.includes("text-right"));
  const alignJustify = elementClasses.some((c) => c.includes("text-justify"));

  const fontSize = parseFontSize(selectedElement.styles?.fontSize ?? "16px");
  const textColor =
    selectedElement.styles?.webkitTextFillColor ||
    selectedElement.styles?.color ||
    "#000000";
  const fontFamily =
    selectedElement.styles?.fontFamily
      ?.split(",")[0]
      ?.trim()
      .replace(/^'|'$/g, "") || "sans-serif";

  const handleAddClass = () => {
    const trimmed = newClassInput.trim();
    if (trimmed) {
      onAddClass(trimmed);
      setNewClassInput("");
    }
  };

  const isText = selectedElement.isTextElement;

  const toolbarContent = (
    <div className="flex items-center gap-1.5 bg-canvas-panel border border-white/10 rounded-xl p-1.5 shadow-lg w-max">
      {isText && (
        <>
          <button
            type="button"
            onClick={onToggleBold}
            className={`${btnBase} ${hasBold ? btnActive : btnInactive}`}
            title="Bold"
          >
            <span className="font-bold text-sm">B</span>
          </button>
          <button
            type="button"
            onClick={onToggleItalic}
            className={`${btnBase} ${hasItalic ? btnActive : btnInactive}`}
            title="Italic"
          >
            <span className="italic text-sm">I</span>
          </button>
          <button
            type="button"
            onClick={onToggleUnderline}
            className={`${btnBase} ${hasUnderline ? btnActive : btnInactive}`}
            title="Underline"
          >
            <span className="underline text-sm">U</span>
          </button>
          <button
            type="button"
            onClick={onToggleStrikethrough}
            className={`${btnBase} ${hasStrikethrough ? btnActive : btnInactive}`}
            title="Strikethrough"
          >
            <span className="line-through text-sm">S</span>
          </button>
          <div className="w-px h-5 bg-white/20 mx-0.5" />
          {onSetFontFamily && (
            <select
              value={fontFamily}
              onChange={(e) => onSetFontFamily(e.target.value)}
              className="h-8 min-w-[90px] max-w-[120px] px-2 rounded-md text-xs bg-white/5 border border-white/10 text-white/90 focus:outline-none focus:ring-2 focus:ring-[#8A87F8]"
              style={{ fontFamily }}
              title="Font"
            >
              {COMMON_FONTS.map((font) => (
                <option
                  key={font}
                  value={font}
                  style={{ fontFamily: font }}
                  className="bg-[#0d0807] text-white/90"
                >
                  {font}
                </option>
              ))}
            </select>
          )}
          {onSetColor && (
            <div className="flex items-center gap-1">
              <input
                type="color"
                value={textColor.startsWith("#") ? textColor : "#000000"}
                onChange={(e) => onSetColor(e.target.value)}
                className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent"
                title="Text color"
              />
            </div>
          )}
          {onSetFontSize && (
            <div className="flex items-center h-8 rounded-md overflow-hidden border border-white/10 bg-white/5">
              <button
                type="button"
                className="w-7 h-full flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white/90"
                onClick={() => onSetFontSize(Math.max(8, fontSize - 2))}
                title="Decrease size"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min={8}
                max={200}
                value={fontSize}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v))
                    onSetFontSize(Math.max(8, Math.min(200, v)));
                }}
                className="w-10 h-full bg-transparent text-center text-xs text-white/90 border-0 border-x border-white/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                className="w-7 h-full flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white/90"
                onClick={() => onSetFontSize(Math.min(200, fontSize + 2))}
                title="Increase size"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => {
                onSetAlignLeft();
              }}
              className={`w-8 h-8 flex items-center justify-center rounded-md ${alignLeft ? btnActive : btnInactive}`}
              title="Align left"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                onSetAlignCenter();
              }}
              className={`w-8 h-8 flex items-center justify-center rounded-md ${alignCenter ? btnActive : btnInactive}`}
              title="Align center"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                onSetAlignRight();
              }}
              className={`w-8 h-8 flex items-center justify-center rounded-md ${alignRight ? btnActive : btnInactive}`}
              title="Align right"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            {onSetAlignJustify && (
              <button
                type="button"
                onClick={() => {
                  onSetAlignJustify();
                }}
                className={`w-8 h-8 flex items-center justify-center rounded-md ${alignJustify ? btnActive : btnInactive}`}
                title="Justify"
              >
                <AlignJustify className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="w-px h-5 bg-white/20 mx-0.5" />
        </>
      )}
      <button
        type="button"
        onClick={() => setShowTailwindMenu(!showTailwindMenu)}
        className={`${btnBase} ${showTailwindMenu ? btnActive : btnInactive}`}
        title="Classes"
      >
        <Code2 className="w-4 h-4" />
      </button>
      {onDeleteElement && (
        <button
          type="button"
          onClick={onDeleteElement}
          className={`${btnBase} text-white/60 hover:bg-red-500/20 hover:text-red-400`}
          title="Delete element"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  const overlayRect = overlayRef?.current?.getBoundingClientRect();
  const portalTop = overlayRect
    ? overlayRect.top +
      (selectedElement.top + selectedElement.height + 8) * zoom
    : 0;
  const portalLeft = overlayRect
    ? overlayRect.left +
      (selectedElement.left + selectedElement.width / 2) * zoom
    : 0;

  if (!mounted) return null;

  const toolbar = (
    <div
      className="fixed z-[99999] flex flex-col gap-2 pointer-events-auto"
      data-uxm-toolbar="true"
      style={{
        top: portalTop,
        left: portalLeft,
        transform: `translate(-50%, 0)`,
        transformOrigin: "top center",
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {toolbarContent}

      {showTailwindMenu && (
        <div className="bg-canvas-panel border border-white/10 rounded-xl p-2.5 shadow-lg min-w-[260px] max-h-[220px] overflow-y-auto">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2 font-medium">
            Tailwind Classes
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <input
              type="text"
              value={newClassInput}
              onChange={(e) => setNewClassInput(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") handleAddClass();
              }}
              placeholder="Add class..."
              className="flex-1 h-8 px-2.5 text-xs bg-white/5 border border-white/10 rounded-md text-white/90 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#8A87F8]"
            />
            <button
              type="button"
              onClick={handleAddClass}
              disabled={!newClassInput.trim()}
              className="h-8 px-3 text-xs bg-[#8A87F8] text-white rounded-md disabled:opacity-50 hover:bg-[#7674d6] font-medium"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {elementClasses.length === 0 ? (
              <span className="text-xs text-white/40">No classes</span>
            ) : (
              elementClasses.map((cls, idx) => (
                <span
                  key={`${cls}-${idx}`}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] bg-white/10 text-white/70 rounded-md group"
                >
                  {cls}
                  <button
                    type="button"
                    onClick={() => onRemoveClass(cls)}
                    className="text-white/40 hover:text-red-400"
                    title="Remove class"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(toolbar, document.body);
}
