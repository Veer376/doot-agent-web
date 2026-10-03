"use client";

import React, {
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CheckIcon, CopyIcon, MessageSquareQuoteIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectionState = {
  text: string;
  left: number;
  top: number;
};

export const DOOT_QUOTE_SELECTION_EVENT = "doot:quote-selection";

export function ResponseSelectionActions({
  children,
  disabled = false,
  className,
}: {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [copied, setCopied] = useState(false);

  const updateSelection = useCallback(() => {
    if (disabled || !rootRef.current) {
      setSelection(null);
      return;
    }

    requestAnimationFrame(() => {
      const browserSelection = window.getSelection();
      if (
        !browserSelection ||
        browserSelection.isCollapsed ||
        browserSelection.rangeCount === 0
      ) {
        setSelection(null);
        return;
      }

      const range = browserSelection.getRangeAt(0);
      const commonAncestor =
        range.commonAncestorContainer.nodeType === Node.TEXT_NODE
          ? range.commonAncestorContainer.parentNode
          : range.commonAncestorContainer;

      if (!commonAncestor || !rootRef.current?.contains(commonAncestor)) {
        setSelection(null);
        return;
      }

      const text = browserSelection.toString().trim();
      if (!text) {
        setSelection(null);
        return;
      }

      const rangeRect = range.getBoundingClientRect();
      const rootRect = rootRef.current.getBoundingClientRect();
      setCopied(false);
      setSelection({
        text: text.slice(0, 4000),
        left: rangeRect.left - rootRect.left + rangeRect.width / 2,
        top: rangeRect.top - rootRect.top - 8,
      });
    });
  }, [disabled]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const browserSelection = window.getSelection();
      if (!browserSelection || browserSelection.isCollapsed) {
        setSelection(null);
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  const preserveSelection = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleCopy = async () => {
    if (!selection) return;
    await navigator.clipboard.writeText(selection.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const handleAskDoot = () => {
    if (!selection) return;
    window.dispatchEvent(
      new CustomEvent(DOOT_QUOTE_SELECTION_EVENT, {
        detail: { text: selection.text },
      }),
    );
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  };

  return (
    <div
      ref={rootRef}
      className={cn("doot-assistant-selectable relative w-full", className)}
      onMouseUp={updateSelection}
      onKeyUp={updateSelection}
      onTouchEnd={updateSelection}
    >
      {children}
      {selection && (
        <div
          className={cn(
            "bg-popover text-popover-foreground border-border absolute z-50 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-xl border p-1 shadow-lg",
            "animate-in fade-in-0 zoom-in-95 duration-100",
          )}
          style={{ left: selection.left, top: selection.top }}
          role="toolbar"
          aria-label="Selected response actions"
        >
          <button
            type="button"
            className="hover:bg-muted flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors"
            onMouseDown={preserveSelection}
            onClick={handleCopy}
            aria-label="Copy selected text"
          >
            {copied ? (
              <CheckIcon className="h-3.5 w-3.5" />
            ) : (
              <CopyIcon className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            className="hover:bg-muted flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors"
            onMouseDown={preserveSelection}
            onClick={handleAskDoot}
            aria-label="Ask Doot about selected text"
          >
            <MessageSquareQuoteIcon className="h-3.5 w-3.5" />
            Ask Doot
          </button>
        </div>
      )}
    </div>
  );
}
