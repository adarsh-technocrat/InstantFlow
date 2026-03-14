"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ElementInfo,
  HoveredElement,
  SelectedElement,
} from "@/components/frame/element-inspection/types";
import { createTriggerIframeReady } from "@/lib/frame-utils";

function convertScreenToIframeCoordinates(
  clientX: number,
  clientY: number,
  overlayRect: DOMRect,
  iframeWidth: number,
  iframeHeight: number,
): { x: number; y: number } {
  const relativeX = (clientX - overlayRect.left) / overlayRect.width;
  const relativeY = (clientY - overlayRect.top) / overlayRect.height;
  return {
    x: relativeX * iframeWidth,
    y: relativeY * iframeHeight,
  };
}

export interface UseFrameElementInspectionOptions {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
}

export function useFrameElementInspection({
  iframeRef,
  overlayRef,
  enabled,
}: UseFrameElementInspectionOptions) {
  const [iframeReady, setIframeReady] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<HoveredElement>(null);
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [elementClasses, setElementClasses] = useState<string[]>([]);
  const [showTailwindMenu, setShowTailwindMenu] = useState(false);
  const [newClassInput, setNewClassInput] = useState("");

  const sendToIframe = useCallback(
    (type: string, payload: Record<string, unknown>) => {
      iframeRef.current?.contentWindow?.postMessage({ type, payload }, "*");
    },
    [iframeRef],
  );

  const requestElementInfoAtPosition = useCallback(
    (x: number, y: number) => {
      sendToIframe("GET_ELEMENT_INFO", { x, y });
    },
    [sendToIframe],
  );

  const highlightElement = useCallback(
    (elementId: string | null) => {
      sendToIframe("HIGHLIGHT_ELEMENT", { elementId, highlight: !!elementId });
    },
    [sendToIframe],
  );

  const selectElementInIframe = useCallback(
    (elementId: string | null) => {
      sendToIframe("SELECT_ELEMENT", { elementId });
    },
    [sendToIframe],
  );

  const setElementVisibility = useCallback(
    (elementId: string, hide: boolean) => {
      sendToIframe("HIDE_ELEMENT", { elementId, hide });
    },
    [sendToIframe],
  );

  const updateTextInIframe = useCallback(
    (elementId: string, newText: string) => {
      sendToIframe("UPDATE_TEXT", { elementId, newText });
    },
    [sendToIframe],
  );

  const addClassToElement = useCallback(
    (elementId: string, className: string) => {
      sendToIframe("ADD_CLASS", { elementId, className });
    },
    [sendToIframe],
  );

  const removeClassFromElement = useCallback(
    (elementId: string, className: string) => {
      sendToIframe("REMOVE_CLASS", { elementId, className });
    },
    [sendToIframe],
  );

  const toggleClassOnElement = useCallback(
    (elementId: string, className: string) => {
      sendToIframe("TOGGLE_CLASS", { elementId, className });
    },
    [sendToIframe],
  );

  const getElementClasses = useCallback(
    (elementId: string) => {
      sendToIframe("GET_CLASSES", { elementId });
    },
    [sendToIframe],
  );

  const applyStyleToElement = useCallback(
    (elementId: string, styles: Record<string, string>) => {
      sendToIframe("APPLY_STYLE", { elementId, styles });
    },
    [sendToIframe],
  );

  const deleteElement = useCallback(
    (elementId: string) => {
      sendToIframe("DELETE_ELEMENT", { elementId });
    },
    [sendToIframe],
  );

  const handleElementInfoReceived = useCallback((info: ElementInfo) => {
    if (info?.elementId == null) return;
    setHoveredElement({
      elementId: info.elementId,
      tagName: info.tagName,
      top: info.rect.top,
      left: info.rect.left,
      width: info.rect.width,
      height: info.rect.height,
    });
  }, []);

  const handleClassesUpdated = useCallback(
    (elementId: string, classes: string[]) => {
      if (selectedElement?.elementId === elementId) {
        setElementClasses(classes);
      }
    },
    [selectedElement?.elementId],
  );

  const handleTextUpdated = useCallback(
    (
      elementId: string,
      newText: string,
      rect?: { top: number; left: number; width: number; height: number },
    ) => {
      if (selectedElement?.elementId === elementId) {
        setSelectedElement((prev) =>
          prev
            ? {
                ...prev,
                text: newText,
                ...(rect
                  ? {
                      top: rect.top,
                      left: rect.left,
                      width: rect.width,
                      height: rect.height,
                    }
                  : {}),
              }
            : null,
        );
      }
    },
    [selectedElement?.elementId],
  );

  const syncTextToIframeLive = useCallback(
    (html: string, editorEl?: HTMLElement | null) => {
      if (!selectedElement?.elementId) return;
      try {
        const doc = iframeRef.current?.contentDocument;
        if (doc) {
          const el = doc.querySelector(
            '[data-uxm-element-id="' + selectedElement.elementId + '"]',
          );
          if (el) {
            el.innerHTML = html;
            if (editorEl) {
              const rect = el.getBoundingClientRect();
              editorEl.style.width = rect.width + "px";
              editorEl.style.minHeight = rect.height + "px";
              editorEl.style.top = rect.top + "px";
              editorEl.style.left = rect.left + "px";
              const toolbar = overlayRef.current?.querySelector(
                "[data-uxm-toolbar]",
              ) as HTMLElement | null;
              if (toolbar) {
                toolbar.style.top =
                  Math.max(0, rect.top + rect.height + 8) + "px";
                toolbar.style.left =
                  Math.max(0, rect.left + rect.width / 2) + "px";
              }
            }
            return;
          }
        }
      } catch {
      }
      sendToIframe("SYNC_TEXT", {
        elementId: selectedElement.elementId,
        newText: html,
      });
    },
    [selectedElement?.elementId, iframeRef, overlayRef, sendToIframe],
  );

  useEffect(() => {
    if (!enabled) return;
    setIframeReady(false);
    if (!iframeRef) return;
    const triggerIframeReady = createTriggerIframeReady(
      () => iframeRef.current,
      {
        retryDelay: 100,
        onError: (err) =>
          console.warn("Inspector iframe ready:", err?.message),
      },
    );
    const timeoutId = setTimeout(triggerIframeReady, 100);
    return () => clearTimeout(timeoutId);
  }, [enabled, iframeRef]);

  useEffect(() => {
    if (!enabled) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data ?? {};
      switch (type) {
        case "IFRAME_READY":
          if (event.data?.source === "element-inspector") {
            setIframeReady(true);
          }
          break;
        case "ELEMENT_INFO":
          if (payload) handleElementInfoReceived(payload as ElementInfo);
          break;
        case "TEXT_UPDATED":
          if (
            payload?.elementId != null &&
            payload?.newText != null
          ) {
            handleTextUpdated(
              payload.elementId,
              payload.newText,
              payload.rect,
            );
          }
          break;
        case "CLASSES_UPDATED":
        case "ELEMENT_CLASSES":
          if (
            payload?.elementId != null &&
            Array.isArray(payload?.classes)
          ) {
            handleClassesUpdated(payload.elementId, payload.classes);
          }
          break;
        case "ELEMENT_DELETED":
          if (
            payload?.elementId != null &&
            selectedElement?.elementId === payload.elementId
          ) {
            setSelectedElement(null);
            setElementClasses([]);
            setIsEditing(false);
            highlightElement(null);
            selectElementInIframe(null);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    enabled,
    handleElementInfoReceived,
    handleTextUpdated,
    handleClassesUpdated,
    selectedElement?.elementId,
    highlightElement,
    selectElementInIframe,
  ]);

  const handleOverlayMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (
        !enabled ||
        !iframeReady ||
        !overlayRef.current ||
        !iframeRef.current
      )
        return;
      const overlayRect = overlayRef.current.getBoundingClientRect();
      const { x, y } = convertScreenToIframeCoordinates(
        e.clientX,
        e.clientY,
        overlayRect,
        iframeRef.current.clientWidth,
        iframeRef.current.clientHeight,
      );
      requestElementInfoAtPosition(x, y);
    },
    [
      enabled,
      iframeReady,
      overlayRef,
      iframeRef,
      requestElementInfoAtPosition,
    ],
  );

  const handleOverlayMouseLeave = useCallback(() => {
    setHoveredElement(null);
    highlightElement(null);
  }, [highlightElement]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (
        !enabled ||
        !iframeReady ||
        !overlayRef.current ||
        !iframeRef.current
      )
        return;
      if (!hoveredElement) return;
      e.stopPropagation();

      const overlayRect = overlayRef.current.getBoundingClientRect();
      const { x, y } = convertScreenToIframeCoordinates(
        e.clientX,
        e.clientY,
        overlayRect,
        iframeRef.current.clientWidth,
        iframeRef.current.clientHeight,
      );

      const onResponse = (event: MessageEvent) => {
        const { type, payload } = event.data ?? {};
        if (type !== "ELEMENT_INFO" || !payload) return;
        const info = payload as ElementInfo;

        setSelectedElement({
          elementId: info.elementId,
          tagName: info.tagName,
          top: info.rect.top,
          left: info.rect.left,
          width: info.rect.width,
          height: info.rect.height,
          isTextElement: info.isTextElement ?? false,
          text: info.text ?? "",
          innerHTML: info.innerHTML ?? "",
          styles: info.styles,
        });
        selectElementInIframe(info.elementId);
        getElementClasses(info.elementId);

        if (info.isTextElement && info.innerHTML) {
          setEditText(info.innerHTML);
          setIsEditing(true);
          setElementVisibility(info.elementId, true);
        }
        window.removeEventListener("message", onResponse);
      };

      window.addEventListener("message", onResponse);
      requestElementInfoAtPosition(x, y);
    },
    [
      enabled,
      iframeReady,
      hoveredElement,
      overlayRef,
      iframeRef,
      requestElementInfoAtPosition,
      selectElementInIframe,
      getElementClasses,
      setElementVisibility,
    ],
  );

  const submitTextEdit = useCallback(
    (newHTML?: string) => {
      if (!selectedElement?.isTextElement) return;
      const htmlToSave = newHTML ?? editText;
      updateTextInIframe(selectedElement.elementId, htmlToSave);
      setElementVisibility(selectedElement.elementId, false);
      setIsEditing(false);
    },
    [selectedElement, editText, updateTextInIframe, setElementVisibility],
  );

  const cancelTextEdit = useCallback(() => {
    if (selectedElement) {
      setElementVisibility(selectedElement.elementId, false);
    }
    setIsEditing(false);
    setEditText(selectedElement?.innerHTML ?? "");
  }, [selectedElement, setElementVisibility]);

  const removeAlignmentClasses = useCallback(
    (elementId: string) => {
      ["text-left", "text-center", "text-right", "text-justify"].forEach(
        (cls) => removeClassFromElement(elementId, cls),
      );
    },
    [removeClassFromElement],
  );

  const handleToggleBold = useCallback(() => {
    if (!selectedElement) return;
    const hasBold = elementClasses.some(
      (c) =>
        c.includes("font-bold") ||
        c.includes("font-semibold") ||
        c.includes("font-extrabold"),
    );
    if (hasBold) {
      removeClassFromElement(selectedElement.elementId, "font-bold");
      removeClassFromElement(selectedElement.elementId, "font-semibold");
      removeClassFromElement(selectedElement.elementId, "font-extrabold");
    } else {
      addClassToElement(selectedElement.elementId, "font-bold");
    }
  }, [
    selectedElement,
    elementClasses,
    addClassToElement,
    removeClassFromElement,
  ]);

  const handleToggleItalic = useCallback(() => {
    if (!selectedElement) return;
    const hasItalic = elementClasses.some((c) => c.includes("italic"));
    if (hasItalic) {
      removeClassFromElement(selectedElement.elementId, "italic");
    } else {
      addClassToElement(selectedElement.elementId, "italic");
    }
  }, [
    selectedElement,
    elementClasses,
    addClassToElement,
    removeClassFromElement,
  ]);

  const handleToggleUnderline = useCallback(() => {
    if (!selectedElement) return;
    const hasUnderline = elementClasses.some((c) => c.includes("underline"));
    if (hasUnderline) {
      removeClassFromElement(selectedElement.elementId, "underline");
    } else {
      addClassToElement(selectedElement.elementId, "underline");
    }
  }, [
    selectedElement,
    elementClasses,
    addClassToElement,
    removeClassFromElement,
  ]);

  const handleToggleStrikethrough = useCallback(() => {
    if (!selectedElement) return;
    const hasStrikethrough = elementClasses.some((c) =>
      c.includes("line-through"),
    );
    if (hasStrikethrough) {
      removeClassFromElement(selectedElement.elementId, "line-through");
    } else {
      addClassToElement(selectedElement.elementId, "line-through");
    }
  }, [
    selectedElement,
    elementClasses,
    addClassToElement,
    removeClassFromElement,
  ]);

  const handleSetAlignLeft = useCallback(() => {
    if (!selectedElement) return;
    removeAlignmentClasses(selectedElement.elementId);
    addClassToElement(selectedElement.elementId, "text-left");
  }, [selectedElement, removeAlignmentClasses, addClassToElement]);

  const handleSetAlignCenter = useCallback(() => {
    if (!selectedElement) return;
    removeAlignmentClasses(selectedElement.elementId);
    addClassToElement(selectedElement.elementId, "text-center");
  }, [selectedElement, removeAlignmentClasses, addClassToElement]);

  const handleSetAlignRight = useCallback(() => {
    if (!selectedElement) return;
    removeAlignmentClasses(selectedElement.elementId);
    addClassToElement(selectedElement.elementId, "text-right");
  }, [selectedElement, removeAlignmentClasses, addClassToElement]);

  const handleSetAlignJustify = useCallback(() => {
    if (!selectedElement) return;
    removeAlignmentClasses(selectedElement.elementId);
    addClassToElement(selectedElement.elementId, "text-justify");
  }, [selectedElement, removeAlignmentClasses, addClassToElement]);

  const handleAddClass = useCallback(
    (className: string) => {
      if (selectedElement) {
        addClassToElement(selectedElement.elementId, className);
      }
    },
    [selectedElement, addClassToElement],
  );

  const handleRemoveClass = useCallback(
    (className: string) => {
      if (selectedElement) {
        removeClassFromElement(selectedElement.elementId, className);
      }
    },
    [selectedElement, removeClassFromElement],
  );

  const handleSetColor = useCallback(
    (color: string) => {
      if (!selectedElement) return;
      applyStyleToElement(selectedElement.elementId, { color });
      setSelectedElement((prev) =>
        prev ? { ...prev, styles: { ...prev.styles, color } } : null,
      );
    },
    [selectedElement, applyStyleToElement],
  );

  const handleSetFontSize = useCallback(
    (fontSizePx: number) => {
      if (!selectedElement) return;
      const value = `${fontSizePx}px`;
      applyStyleToElement(selectedElement.elementId, { fontSize: value });
      setSelectedElement((prev) =>
        prev ? { ...prev, styles: { ...prev.styles, fontSize: value } } : null,
      );
    },
    [selectedElement, applyStyleToElement],
  );

  const handleSetFontFamily = useCallback(
    (fontFamily: string) => {
      if (!selectedElement) return;
      applyStyleToElement(selectedElement.elementId, { fontFamily });
      setSelectedElement((prev) =>
        prev
          ? { ...prev, styles: { ...prev.styles, fontFamily } }
          : null,
      );
    },
    [selectedElement, applyStyleToElement],
  );

  const handleDeleteElement = useCallback(() => {
    if (!selectedElement) return;
    deleteElement(selectedElement.elementId);
    setSelectedElement(null);
    setElementClasses([]);
    setIsEditing(false);
    highlightElement(null);
    selectElementInIframe(null);
  }, [
    selectedElement,
    deleteElement,
    highlightElement,
    selectElementInIframe,
  ]);

  return {
    iframeReady,
    hoveredElement,
    selectedElement,
    isEditing,
    editText,
    setEditText,
    elementClasses,
    showTailwindMenu,
    setShowTailwindMenu,
    newClassInput,
    setNewClassInput,
    handleOverlayMouseMove,
    handleOverlayMouseLeave,
    handleOverlayClick,
    submitTextEdit,
    cancelTextEdit,
    syncTextToIframeLive,
    highlightElement,
    requestElementInfoAtPosition,
    getElementClasses,
    handleToggleBold,
    handleToggleItalic,
    handleToggleUnderline,
    handleToggleStrikethrough,
    handleSetAlignLeft,
    handleSetAlignCenter,
    handleSetAlignRight,
    handleAddClass,
    handleRemoveClass,
    applyStyleToElement,
    deleteElement,
    handleSetColor,
    handleSetFontSize,
    handleSetFontFamily,
    handleSetAlignJustify,
    handleDeleteElement,
  };
}
