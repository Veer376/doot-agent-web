"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import { MessageSquare, Pencil, Trash2, X, ArrowUp } from "lucide-react";

export type ResponseAnnotation = {
  id: string;
  text: string;
  note: string;
  source: { turnId: string; startOffset: number; endOffset: number };
};
type Anchor = { left: number; top: number; bottom: number };
type AnnotationContextValue = {
  annotations: ResponseAnnotation[];
  editing: boolean;
  remove: (id: string) => void;
  edit: (
    annotation: ResponseAnnotation,
    anchor: Anchor,
    isNew?: boolean,
  ) => void;
};
const AnnotationContext = createContext<AnnotationContextValue | null>(null);
export const useAnnotations = () => useContext(AnnotationContext);

type PreviewPosition = { left: number; top?: number; bottom?: number };
function previewPosition(rect: DOMRect): PreviewPosition {
  const left = Math.max(
    8,
    Math.min(
      rect.left,
      window.innerWidth - Math.min(420, window.innerWidth - 16) - 8,
    ),
  );
  const height = Math.min(360, window.innerHeight * 0.55);
  return rect.top >= height + 16
    ? { left, bottom: window.innerHeight - rect.top + 8 }
    : {
        left,
        top: Math.max(
          8,
          Math.min(rect.bottom + 8, window.innerHeight - height - 8),
        ),
      };
}

export function AnnotationProvider({
  children,
  annotations,
  setAnnotations,
}: {
  children: ReactNode;
  annotations: ResponseAnnotation[];
  setAnnotations: Dispatch<SetStateAction<ResponseAnnotation[]>>;
}) {
  const [editor, setEditor] = useState<{
    annotation: ResponseAnnotation;
    anchor: Anchor;
    isNew: boolean;
  } | null>(null);
  const [note, setNote] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const remove = (id: string) => {
    setAnnotations((current) => current.filter((item) => item.id !== id));
    if (editor?.annotation.id === id) setEditor(null);
  };
  const cancel = () => {
    if (editor?.isNew) remove(editor.annotation.id);
    setEditor(null);
  };
  const save = () => {
    if (!editor) return;
    setAnnotations((current) =>
      current.map((item) =>
        item.id === editor.annotation.id
          ? { ...item, note: note.trim() }
          : item,
      ),
    );
    setEditor(null);
    document
      .querySelector<HTMLElement>("[data-doot-composer-editor]")
      ?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!editor) return;
    if (!annotations.some((item) => item.id === editor.annotation.id)) {
      setEditor(null);
      return;
    }
    textareaRef.current?.focus({ preventScroll: true });
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        (editorRef.current?.contains(event.target) ||
          event.target.closest("[data-annotation-action]"))
      )
        return;
      // Dismissal keeps the saved annotation; only Cancel discards a new draft.
      setEditor(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [editor, annotations]);
  const edit = (
    annotation: ResponseAnnotation,
    anchor: Anchor,
    isNew = false,
  ) => {
    if (isNew) setAnnotations((current) => [...current, annotation]);
    setNote(annotation.note);
    setEditor({ annotation, anchor, isNew });
    window.getSelection()?.removeAllRanges();
  };
  return (
    <AnnotationContext.Provider
      value={{ annotations, edit, remove, editing: Boolean(editor) }}
    >
      {children}
      {editor &&
        createPortal(
          <div
            ref={editorRef}
            className="doot-annotation-note"
            role="dialog"
            aria-label="Edit annotation"
            style={{
              left: Math.max(
                8,
                Math.min(
                  editor.anchor.left,
                  window.innerWidth - Math.min(420, window.innerWidth - 16) - 8,
                ),
              ),
              top: Math.max(
                8,
                Math.min(editor.anchor.top - 144, window.innerHeight - 184),
              ),
            }}
          >
            <textarea
              ref={textareaRef}
              aria-label="Annotation comment"
              placeholder="Add a comment…"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  save();
                }
              }}
            />
            <div className="doot-annotation-note-actions">
              <button
                type="button"
                aria-label="Delete annotation"
                onClick={() => remove(editor.annotation.id)}
              >
                <Trash2 size={17} />
              </button>
              <span className="flex-1" />
              <button
                type="button"
                onClick={cancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="doot-annotation-save"
                aria-label="Save annotation"
                onClick={save}
              >
                {editor.isNew ? <ArrowUp size={18} /> : "Save"}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </AnnotationContext.Provider>
  );
}

export function AnnotationDetails({
  annotation,
  index,
}: {
  annotation: ResponseAnnotation;
  index: number;
}) {
  const context = useAnnotations();
  return (
    <div className="doot-annotation-detail">
      <span className="doot-annotation-detail-number">{index + 1}.</span>
      <div className="min-w-0 flex-1">
        <span className="text-muted-foreground">Selected text:</span>
        <p>{annotation.text}</p>
        <span className="text-muted-foreground">User comment:</span>
        <p>{annotation.note || "No comment"}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          data-annotation-action
          aria-label={`Edit annotation ${index + 1}`}
          onClick={(event) =>
            context?.edit(
              annotation,
              event.currentTarget.getBoundingClientRect(),
            )
          }
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          data-annotation-action
          aria-label={`Delete annotation ${index + 1}`}
          onClick={() => context?.remove(annotation.id)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export function AnnotationChip() {
  const context = useAnnotations();
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [position, setPosition] = useState<PreviewPosition | null>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const annotations = context?.annotations ?? [];
  const open =
    annotations.length > 0 && (pinned || hovered) && !context?.editing;
  const enter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHovered(true);
  };
  const leave = () => {
    closeTimer.current = setTimeout(() => setHovered(false), 120);
  };
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = chipRef.current?.getBoundingClientRect();
      if (rect) setPosition(previewPosition(rect));
    };
    update();
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !chipRef.current?.contains(event.target) &&
        !panelRef.current?.contains(event.target)
      ) {
        setPinned(false);
        setHovered(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPinned(false);
        setHovered(false);
      }
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );
  if (!annotations.length) return null;
  return (
    <div className="doot-annotation-chip-row">
      <div
        className="doot-annotation-chip"
        ref={chipRef}
        onMouseEnter={enter}
        onMouseLeave={leave}
      >
        <button
          type="button"
          data-annotation-action
          aria-label={`${annotations.length} ${annotations.length === 1 ? "annotation" : "annotations"}`}
          aria-expanded={open}
          onClick={() => setPinned((value) => !value)}
          onFocus={enter}
        >
          <MessageSquare size={15} />
          {annotations.length}{" "}
          {annotations.length === 1 ? "annotation" : "annotations"}
        </button>
        <button
          type="button"
          className="doot-annotation-clear"
          aria-label="Remove all annotations"
          onClick={() => {
            annotations.forEach((item) => context?.remove(item.id));
            setPinned(false);
            setHovered(false);
          }}
        >
          <X size={14} />
        </button>
      </div>
      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            className="doot-annotation-details"
            role="region"
            aria-label="Attached annotations"
            style={position}
            onMouseEnter={enter}
            onMouseLeave={leave}
          >
            {annotations.map((annotation, index) => (
              <AnnotationDetails
                key={annotation.id}
                annotation={annotation}
                index={index}
              />
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function AnnotationMarker({
  annotation,
  index,
}: {
  annotation: ResponseAnnotation;
  index: number;
}) {
  const context = useAnnotations();
  const markerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState<PreviewPosition | null>(null);
  const enter = () => {
    if (timer.current) clearTimeout(timer.current);
    const rect = markerRef.current?.getBoundingClientRect();
    if (rect) setPosition(previewPosition(rect));
  };
  const leave = () => {
    timer.current = setTimeout(() => setPosition(null), 120);
  };
  useEffect(() => {
    const close = (event: Event) => {
      if (
        event.target instanceof Node &&
        panelRef.current?.contains(event.target)
      )
        return;
      setPosition(null);
    };
    window.addEventListener("scroll", close, true);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("scroll", close, true);
    };
  }, []);
  return (
    <>
      <button
        ref={markerRef}
        type="button"
        data-annotation-action
        className="doot-annotation-marker"
        aria-label={`Annotation ${index + 1}`}
        onMouseEnter={enter}
        onMouseLeave={leave}
        onFocus={enter}
        onBlur={leave}
        onClick={(event) => {
          setPosition(null);
          context?.edit(
            annotation,
            event.currentTarget.getBoundingClientRect(),
          );
        }}
      >
        {index + 1}
      </button>
      {position &&
        !context?.editing &&
        createPortal(
          <div
            ref={panelRef}
            className="doot-annotation-details"
            role="region"
            aria-label={`Annotation ${index + 1} details`}
            style={position}
            onMouseEnter={enter}
            onMouseLeave={leave}
          >
            <AnnotationDetails
              annotation={annotation}
              index={index}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
