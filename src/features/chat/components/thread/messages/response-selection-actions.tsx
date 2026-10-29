"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Copy, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useAnnotations,
  AnnotationMarker,
  type ResponseAnnotation,
} from "../annotations";
export type { ResponseAnnotation } from "../annotations";

type SelectionState = {
  text: string;
  left: number;
  top: number;
  source: ResponseAnnotation["source"];
};
type Marker = {
  annotation: ResponseAnnotation;
  index: number;
  rects: { left: number; top: number; width: number; height: number }[];
};

function sourceRange(root: HTMLElement, start: number, end: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest("[data-annotation-ui]")
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  const range = document.createRange();
  let offset = 0;
  let hasStart = false;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const length = node.textContent?.length ?? 0;
    if (!hasStart && start <= offset + length) {
      range.setStart(node, Math.max(0, start - offset));
      hasStart = true;
    }
    if (hasStart && end <= offset + length) {
      range.setEnd(node, Math.max(0, end - offset));
      return range;
    }
    offset += length;
  }
  return null;
}

export function ResponseSelectionActions({
  children,
  turnId,
  disabled = false,
  className,
}: {
  children: ReactNode;
  turnId: string;
  disabled?: boolean;
  className?: string;
}) {
  const context = useAnnotations();
  const rootRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const annotations = context?.annotations;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const update = () => {
      const bounds = root.getBoundingClientRect();
      setMarkers(
        (annotations ?? []).flatMap((annotation, index) => {
          if (annotation.source.turnId !== turnId) return [];
          const range = sourceRange(
            root,
            annotation.source.startOffset,
            annotation.source.endOffset,
          );
          const rects = Array.from(range?.getClientRects() ?? [])
            .filter((rect) => rect.width > 0 && rect.height > 0)
            .map((rect) => ({
              left: rect.left - bounds.left,
              top: rect.top - bounds.top,
              width: rect.width,
              height: rect.height,
            }));
          return rects.length ? [{ annotation, index, rects }] : [];
        }),
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [annotations, turnId]);

  useEffect(() => {
    let frame = 0;
    const dismiss = () => {
      cancelAnimationFrame(frame);
      setSelection(null);
    };
    const update = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest(
          "[data-annotation-ui], [data-annotation-action], .doot-annotation-note",
        )
      )
        return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (actionsRef.current?.contains(document.activeElement)) return;
        const selected = window.getSelection();
        const root = rootRef.current;
        if (
          disabled ||
          !root ||
          !selected?.rangeCount ||
          selected.isCollapsed
        ) {
          setSelection(null);
          return;
        }
        const range = selected.getRangeAt(0);
        const responseFor = (node: Node) =>
          (node instanceof Element ? node : node.parentElement)?.closest(
            "[data-doot-response-content]",
          );
        if (
          !root.contains(range.commonAncestorContainer) ||
          !responseFor(range.startContainer) ||
          !responseFor(range.endContainer)
        ) {
          setSelection(null);
          return;
        }
        const text = selected.toString().trim();
        if (!text) {
          setSelection(null);
          return;
        }
        const prefix = range.cloneRange();
        prefix.selectNodeContents(root);
        prefix.setEnd(range.startContainer, range.startOffset);
        const startOffset = prefix.toString().length;
        const rect = range.getBoundingClientRect();
        setSelection({
          text,
          left: Math.max(8, Math.min(rect.left, window.innerWidth - 224)),
          top: Math.max(8, rect.top - 44),
          source: {
            turnId,
            startOffset,
            endOffset: startOffset + range.toString().length,
          },
        });
      });
    };
    const pointerdown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !actionsRef.current?.contains(event.target)
      )
        dismiss();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
      if (event.shiftKey && event.key === "F10" && selection) {
        event.preventDefault();
        actionsRef.current
          ?.querySelector<HTMLButtonElement>("button")
          ?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("selectionchange", update);
    document.addEventListener("pointerup", update);
    document.addEventListener("pointerdown", pointerdown);
    document.addEventListener("keydown", keydown);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", update);
      document.removeEventListener("pointerup", update);
      document.removeEventListener("pointerdown", pointerdown);
      document.removeEventListener("keydown", keydown);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [disabled, selection?.text, turnId]);

  const add = () => {
    if (!selection) return;
    context?.edit(
      {
        id: crypto.randomUUID(),
        text: selection.text,
        note: "",
        source: selection.source,
      },
      {
        left: selection.left,
        top: selection.top + 44,
        bottom: selection.top + 66,
      },
      true,
    );
    setSelection(null);
  };
  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className={cn("doot-assistant-selectable relative w-full", className)}
    >
      {children}
      {markers.map(({ annotation, index, rects }) => (
        <div
          key={annotation.id}
          data-annotation-ui
          className="doot-annotation-source"
        >
          {rects.map((rect, i) => (
            <span
              key={i}
              className="doot-annotation-highlight"
              style={rect}
            />
          ))}
          <div
            className="doot-annotation-source-anchor"
            style={{
              left:
                rects[rects.length - 1].left +
                rects[rects.length - 1].width -
                5,
              top: rects[rects.length - 1].top - 20,
            }}
          >
            <AnnotationMarker
              annotation={annotation}
              index={index}
            />
          </div>
        </div>
      ))}
      {!disabled &&
        selection &&
        createPortal(
          <div
            ref={actionsRef}
            className="doot-selection-actions"
            role="group"
            aria-label="Selected response actions"
            style={{ left: selection.left, top: selection.top }}
            onPointerDown={(event) => event.preventDefault()}
          >
            <button
              type="button"
              onClick={add}
            >
              <MessageSquare size={14} />
              Add to chat
            </button>
            <button
              type="button"
              aria-label="Copy selected text"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(selection.text);
                } catch {
                  toast.error("Could not copy selected text");
                }
              }}
            >
              <Copy size={14} />
              Copy
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
