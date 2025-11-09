"use client";
import React, { useEffect, useRef } from "react";
import { ComposerSegmentedControl } from "./composer-segmented-control";
import { DragAndDropWrapper } from "./drag-drop-wrapper";
import { StopIcon } from "@/components/icons";
import { ContentBlocksPreview } from "./messages/ContentBlocksPreview";
import { cn } from "@/lib/utils";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { AttachIcon } from "@/components/icons";

interface ComposerProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
  onCancel?: () => void;
  onPaste?: (e: React.ClipboardEvent<HTMLDivElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  contentBlocks?: any[];
  onRemoveBlock?: (index: number) => void;
  onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  focusKey?: string | null;
}

export function Composer({
  value,
  onChange,
  onSubmit,
  onCancel,
  onPaste,
  onKeyDown,
  placeholder = "Type your message...",
  disabled = false,
  isLoading = false,
  contentBlocks = [],
  onRemoveBlock,
  onFileUpload,
  className,
  focusKey,
}: ComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const hasMessage = Boolean(value?.trim()?.length);
  const hasAttachments = contentBlocks.length > 0;
  const isSendDisabled = disabled || (!hasMessage && !hasAttachments);
  // Use data attribute instead of internal state
  const isExpanded = hasMessage || hasAttachments;

  useEffect(() => {
    if (disabled) {
      return;
    }
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const activeElement = document.activeElement;
    if (
      (activeElement && activeElement.tagName === "TEXTAREA") ||
      activeElement?.tagName === "INPUT"
    ) {
      return;
    }
    const focusEditor = () => {
      try {
        editor.focus({ preventScroll: true } as FocusOptions);
      } catch {
        editor.focus();
      }
    };
    const timeoutId = setTimeout(focusEditor, 100);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [disabled, focusKey]);

  useEffect(() => {
    const editorEl = editorRef.current;
    if (!editorEl) return;
    const textContent = editorEl.textContent ?? "";
    if ((value ?? "") !== textContent) {
      editorEl.textContent = value ?? "";
    }
  }, [value]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload?.(e);
      e.target.value = "";
    }
  };

  const handleFileDrop = (files: FileList) => {
    const input = fileInputRef.current;
    if (input && onFileUpload) {
      const dataTransfer = new DataTransfer();
      for (let i = 0; i < files.length; i++) {
        dataTransfer.items.add(files[i]);
      }
      input.files = dataTransfer.files;
      const event = new Event("change", { bubbles: true }) as any;
      Object.defineProperty(event, "target", {
        writable: false,
        value: input,
      });
      onFileUpload(event);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const emitChange = (nextValue: string) => {
    onChange?.(nextValue);
  };

  const handleInput = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const text = editor.textContent ?? "";
    emitChange(text);
  };

  const handlePasteEvent = (event: React.ClipboardEvent<HTMLDivElement>) => {
    onPaste?.(event);
  };

  const handleKeyDownEvent = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      const form = event.currentTarget.closest("form");
      form?.requestSubmit();
      return;
    }
    onKeyDown?.(event);
  };

  return (
    <DragAndDropWrapper onFileDrop={handleFileDrop}>
      <div
        className={cn(
          "group/composer bg-card text-card-foreground dark:bg-card dark:text-card-foreground border-border w-full transition-all duration-300 ease-out",
          "focus-within:border-primary/30 overflow-hidden rounded-3xl border shadow-sm",
          className,
        )}
        data-expanded={isExpanded}
      >
        <form
          onSubmit={handleFormSubmit}
          className={cn(
            "grid w-full transition-all duration-300 ease-out",
            "grid-cols-[auto_1fr_auto]",
            // Collapsed: [leading | primary | trailing]
            // Expanded: primary full width on top, then [leading | . | trailing]
            "[grid-template-areas:'leading_primary_trailing']",
            "group-data-[expanded=true]/composer:[grid-template-areas:'primary_primary_primary'_'leading_footer_trailing']",
            // Dynamic padding: reduced when collapsed, normal when expanded
            "gap-2.5 p-2.5 group-data-[expanded=true]/composer:p-2.5",
          )}
        >
          {/* Leading Area - Attach + Segmented Control */}
          <div
            className={cn(
              "flex items-center gap-2 transition-all duration-300 [grid-area:leading]",
              "group-data-[expanded=true]/composer:mb-0",
            )}
            style={{ transformOrigin: "50% 100%" }}
          >
            <TooltipIconButton
              tooltip="Attach files"
              onClick={handleAttachmentClick}
              aria-label="Attach files"
              type="button"
            >
              <AttachIcon />
            </TooltipIconButton>
            <ComposerSegmentedControl className="max-w-[240px] min-w-[140px] flex-1" />
          </div>

          {/* Primary Area - Editor + Attachments */}
          <div
            className={cn(
              "flex w-full transition-all duration-300 [grid-area:primary]",
              "group-data-[expanded=false]/composer:items-center",
              "group-data-[expanded=true]/composer:mb-2 group-data-[expanded=true]/composer:items-start",
              hasAttachments ? "flex-col gap-2" : "flex-row items-center",
            )}
            style={{ transformOrigin: "0% 100%" }}
          >
            {hasAttachments && (
              <div className="w-full flex flex-wrap items-start gap-2">
                <ContentBlocksPreview
                  blocks={contentBlocks}
                  onRemove={onRemoveBlock || (() => {})}
                />
              </div>
            )}
            {/* Wrapper with transitioning max-height for smooth expansion/collapse */}
            <div
              className={cn(
                "relative w-full rounded-2xl transition-all duration-300 ease-out",
                "group-data-[expanded=false]/composer:overflow-hidden",
                "group-data-[expanded=false]/composer:flex group-data-[expanded=false]/composer:items-center",
                "group-data-[expanded=true]/composer:overflow-visible",
              )}
              style={{
                maxHeight: isExpanded ? "208px" : "44px", // 208px = max-h-52 (52 * 4)
              }}
            >
              {!hasMessage && !hasAttachments && (
                <span
                  className={cn(
                    "text-muted-foreground/60 pointer-events-none absolute left-2 text-sm",
                    "group-data-[expanded=false]/composer:top-1/2 group-data-[expanded=false]/composer:-translate-y-1/2",
                    "group-data-[expanded=true]/composer:top-3",
                  )}
                >
                  {placeholder}
                </span>
              )}
              <div
                ref={editorRef}
                contentEditable={!disabled}
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                aria-placeholder={placeholder}
                onInput={handleInput}
                onPaste={handlePasteEvent}
                onKeyDown={handleKeyDownEvent}
                className={cn(
                  "w-full overflow-y-auto text-base break-words whitespace-pre-wrap outline-none",
                  "disabled:text-muted-foreground disabled:cursor-not-allowed",
                  "group-data-[expanded=false]/composer:min-h-0 group-data-[expanded=false]/composer:p-2",
                  "group-data-[expanded=true]/composer:max-h-52 group-data-[expanded=true]/composer:min-h-[32px] group-data-[expanded=true]/composer:p-2",
                )}
              />
            </div>
          </div>

          {/* Trailing Area - Send/Stop Button */}
          <div
            className={cn(
              "flex items-center justify-end transition-all duration-300 [grid-area:trailing]",
            )}
            style={{ transformOrigin: "50% 50%" }}
          >
            <div className="relative h-10 w-10">
              {isLoading ? (
                <button
                  type="button"
                  onClick={onCancel}
                  aria-label="Cancel"
                  className="focus-visible:ring-ring/50 absolute inset-0 z-50 flex items-center justify-center rounded-full bg-black text-white transition duration-200 hover:bg-black/90 focus-visible:ring-2 focus-visible:outline-none dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <StopIcon />
                </button>
              ) : (
                <button
                  disabled={isSendDisabled}
                  type="submit"
                  className="focus-visible:ring-ring/50 absolute inset-0 z-50 flex items-center justify-center rounded-full bg-black text-white transition duration-300 hover:bg-black/90 focus-visible:ring-2 focus-visible:outline-none disabled:bg-gray-200 disabled:text-gray-500 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-white transition-all duration-500 ease-linear"
                  >
                    <path
                      stroke="none"
                      d="M0 0h24v24H0z"
                      fill="none"
                    />
                    <path
                      d="M5 12l14 0"
                      className="transition-all duration-500 ease-linear"
                      style={{
                        strokeDasharray: hasMessage ? "14" : "7",
                        strokeDashoffset: hasMessage ? "0" : "7",
                      }}
                    />
                    <path d="M13 18l6 -6" />
                    <path d="M13 6l6 6" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileInputChange}
        multiple
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
        className="hidden"
      />
    </DragAndDropWrapper>
  );
}
