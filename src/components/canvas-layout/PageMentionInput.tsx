"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  KeyboardEvent,
  useMemo,
} from "react";

export interface PageOption {
  id: string;
  label: string;
}

interface PageMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  pages: PageOption[];
  placeholder?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  disabled?: boolean;
  className?: string;
}

/** Extracts plain text with @PageLabel for mentions. */
function getTextWithMentions(root: Node): string {
  let out = "";
  const walk = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) {
      out += n.textContent ?? "";
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      const el = n as HTMLElement;
      if (el.dataset.mention === "page" && el.dataset.pageLabel) {
        out += "@" + el.dataset.pageLabel;
      } else {
        n.childNodes.forEach(walk);
      }
    } else {
      n.childNodes.forEach(walk);
    }
  };
  walk(root);
  return out;
}

/** Creates a chip element for a page. */
function createChipElement(label: string, id: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.contentEditable = "false";
  span.dataset.mention = "page";
  span.dataset.pageId = id;
  span.dataset.pageLabel = label;
  span.className =
    "mention-chip inline-flex items-center rounded-md bg-[#8A87F8]/30 px-1.5 py-0.5 text-xs text-[#8A87F8] font-medium mx-0.5 align-middle";
  span.textContent = label;
  return span;
}

/** Returns { node, offset } for the given character offset in container. */
function getNodeAtOffset(
  container: Node,
  targetOffset: number,
): { node: Node; offset: number } | null {
  let current = 0;
  const walk = (n: Node): { node: Node; offset: number } | null => {
    if (n.nodeType === Node.TEXT_NODE) {
      const len = (n.textContent ?? "").length;
      if (current + len >= targetOffset) {
        return { node: n, offset: targetOffset - current };
      }
      current += len;
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      const el = n as HTMLElement;
      if (el.dataset?.mention === "page") {
        const len = (el.dataset.pageLabel ?? "").length + 1;
        if (current + len >= targetOffset) {
          const parent = n.parentNode!;
          const idx = Array.from(parent.childNodes).indexOf(n as ChildNode);
          return {
            node: parent,
            offset: targetOffset <= current ? idx : idx + 1,
          };
        }
        current += len;
      } else {
        for (let i = 0; i < n.childNodes.length; i++) {
          const r = walk(n.childNodes[i]);
          if (r) return r;
        }
      }
    }
    return null;
  };
  return walk(container);
}

export function PageMentionInput({
  value,
  onChange,
  pages,
  placeholder = "Describe what you want to create or change…",
  onKeyDown,
  disabled,
  className = "",
}: PageMentionInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);

  const filteredPages = useMemo(() => {
    if (!query) return pages;
    const q = query.toLowerCase();
    return pages.filter((p) => p.label.toLowerCase().includes(q));
  }, [pages, query]);

  const hideSuggestions = useCallback(() => {
    setQuery("");
    setShowMentionSuggestions(false);
  }, []);

  const insertChip = useCallback(
    (page: PageOption) => {
      const sel = window.getSelection();
      const editor = editorRef.current;
      if (!sel || !editor || sel.rangeCount === 0) return;

      const cursorRange = sel.getRangeAt(0);
      const textBeforeRange = document.createRange();
      textBeforeRange.selectNodeContents(editor);
      textBeforeRange.setEnd(
        cursorRange.startContainer,
        cursorRange.startOffset,
      );
      const textBefore = textBeforeRange.toString();
      const atIdx = textBefore.lastIndexOf("@");
      if (atIdx < 0) {
        hideSuggestions();
        return;
      }
      const startPos = getNodeAtOffset(editor, atIdx);
      if (!startPos) {
        hideSuggestions();
        return;
      }
      const replaceRange = document.createRange();
      replaceRange.setStart(startPos.node, startPos.offset);
      replaceRange.setEnd(cursorRange.startContainer, cursorRange.startOffset);
      const chip = createChipElement(page.label, page.id);
      const spaceAfter = document.createTextNode(" ");
      replaceRange.deleteContents();
      const frag = document.createDocumentFragment();
      frag.appendChild(chip);
      frag.appendChild(document.createTextNode(" "));
      replaceRange.insertNode(frag);
      replaceRange.setStartAfter(frag.lastChild!);
      replaceRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(replaceRange);
      hideSuggestions();
      onChange(getTextWithMentions(editor));
    },
    [onChange, hideSuggestions],
  );

  const handleInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    onChange(getTextWithMentions(editor));

    const sel = window.getSelection();
    if (!sel || sel.anchorNode == null || sel.rangeCount === 0) return;
    if (!editor.contains(sel.anchorNode)) return;

    try {
      const cursorRange = sel.getRangeAt(0);
      const textBeforeRange = document.createRange();
      textBeforeRange.selectNodeContents(editor);
      textBeforeRange.setEnd(
        cursorRange.startContainer,
        cursorRange.startOffset,
      );
      const textBefore = textBeforeRange.toString();
      const atIdx = textBefore.lastIndexOf("@");
      if (atIdx < 0) {
        hideSuggestions();
        return;
      }
      const afterAt = textBefore.slice(atIdx + 1);
      if (/[\s\n]/.test(afterAt) || afterAt.includes("@")) {
        hideSuggestions();
        return;
      }
      setShowMentionSuggestions(true);
      setQuery(afterAt);
      setSelectedIndex(0);
    } catch {
      hideSuggestions();
    }
  }, [onChange, hideSuggestions]);

  const handleKeyDownForAt = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "@") {
      requestAnimationFrame(() => {
        setShowMentionSuggestions(true);
        setQuery("");
        setSelectedIndex(0);
      });
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "@") {
        handleKeyDownForAt(e);
      }
      if (showMentionSuggestions && filteredPages.length > 0) {
        if (e.key === "Tab" || e.key === "Enter") {
          e.preventDefault();
          const page = filteredPages[selectedIndex];
          if (page) insertChip(page);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          hideSuggestions();
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredPages.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          return;
        }
      }
      onKeyDown?.(e);
    },
    [
      handleKeyDownForAt,
      showMentionSuggestions,
      filteredPages,
      selectedIndex,
      insertChip,
      hideSuggestions,
      onKeyDown,
    ],
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredPages]);

  useEffect(() => {
    if (editorRef.current && value === "") {
      editorRef.current.innerHTML = "";
    }
  }, [value]);

  const showSuggestions = showMentionSuggestions;
  const hasPages = filteredPages.length > 0;

  return (
    <div className="relative">
      <div
        ref={editorRef}
        contentEditable={!disabled}
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setTimeout(hideSuggestions, 150);
        }}
        className={`min-h-12 max-h-32 w-full resize-none overflow-y-auto rounded-none border-none bg-transparent p-4 text-sm text-white/90 outline-none ring-0 placeholder:text-zinc-400 focus-visible:ring-0 empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400 ${className}`}
        style={
          {
            fieldSizing: "content",
          } as React.CSSProperties
        }
      />
      {showSuggestions && (
        <div className="absolute bottom-full left-0 right-0 z-50 mb-2 max-h-52 overflow-hidden rounded-xl border border-white/10 bg-[#161414]/95 py-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="max-h-48 overflow-y-auto overscroll-contain px-1">
            <div className="sticky top-0 z-10 flex items-center gap-1.5 px-3 py-2 pb-1.5">
              <div className="h-px flex-1 bg-linear-to-r from-transparent via-white/10 to-transparent" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
                Pages
              </span>
              <div className="h-px flex-1 bg-linear-to-r from-transparent via-white/10 to-transparent" />
            </div>
            {hasPages ? (
              <div className="flex flex-col gap-0.5 pb-1">
                {filteredPages.map((page, i) => (
                  <button
                    key={page.id}
                    type="button"
                    className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-150 ${
                      i === selectedIndex
                        ? "bg-[#8A87F8]/25 text-white shadow-[inset_0_1px_0_rgba(138,135,248,0.15)]"
                        : "text-white/85 hover:bg-white/6 hover:text-white"
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertChip(page);
                    }}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white/50"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                      </svg>
                    </div>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                      {page.label}
                    </span>
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-white/35 tabular-nums">
                      Screen
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-3 py-4 text-center text-[13px] text-white/45">
                No pages yet. Create screens first.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
