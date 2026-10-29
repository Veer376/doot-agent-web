"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SimpleAgentSelector } from "./agent-selector";
import { DragAndDropWrapper } from "./drag-drop-wrapper";
import {
  StopIcon,
  XIcon,
  ChevronUpIcon,
  LoaderIcon,
} from "@/components/icons";
import { ModelSelectorPopover } from "@/components/ui/model-selector-popover";
import { ModelProviderIcon } from "@/components/ui/model-provider-icon";
import { parseSlashCommand, replaceCommand } from "@/lib/slash-command-parser";
import type { SlashCommand } from "@/lib/slash-command-parser";
import type { Model } from "@/types/model";
import { ContentBlocksPreview } from "./messages/ContentBlocksPreview";
import type { ResponseAnnotation } from "./messages/response-selection-actions";
import { config } from "@/config";
import { WorkspaceSelector } from "./workspace-selector";
import { PermissionSelector, ApprovalPanel } from "./permissions";
import { AnnotationChip } from "./annotations";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  AttachIcon as Paperclip,
  ChevronDownIcon,
  PlusIcon,
} from "@/components/icons";

interface ComposerProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
  onAuthRequired?: (pendingMessage: string) => void; // NEW: Auth callback
  onCancel?: () => void;
  onPaste?: (e: React.ClipboardEvent<HTMLDivElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  isStopping?: boolean;
  contentBlocks?: import("@/types/multimodal").Base64ContentBlock[];
  onRemoveBlock?: (index: number) => void;
  onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  /** When true the composer is on a glass/frosted surface — inner
   *  scroll-edge gradient fades switch from opaque `card` to transparent
   *  so they don't clash with the backdrop blur beneath. */
  isGlass?: boolean;
  focusKey?: string | null;

  selectedModel?: Model | null;
  availableModels?: Model[];
  onModelSelect?: (model: Model) => void;
  /** When true the composer is always expanded regardless of content */
  forceExpanded?: boolean;
  annotations?: ResponseAnnotation[];
}

function editorHasMultipleLines(editor: HTMLDivElement, text: string) {
  if (text.includes("\n")) return true;
  if (!text.trim()) return false;

  const lineHeight =
    Number.parseFloat(window.getComputedStyle(editor).lineHeight) || 26;
  const range = document.createRange();
  range.selectNodeContents(editor);
  const contentHeight = range.getBoundingClientRect().height;
  range.detach?.();

  return contentHeight > lineHeight * 1.35;
}

export function Composer({
  value,
  onChange,
  onSubmit,
  onAuthRequired, // NEW
  onCancel,
  onPaste,
  onKeyDown,
  placeholder = "Type your message...",
  disabled = false,
  isLoading = false,
  isStopping = false,
  contentBlocks = [],
  onRemoveBlock,
  onFileUpload,
  className,
  isGlass = false,
  focusKey,

  selectedModel,
  availableModels = [],
  onModelSelect,
  forceExpanded = false,
  annotations = [],
}: ComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [showPlusPopover, setShowPlusPopover] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);

  // Model selector state
  const [activeCommand, setActiveCommand] = useState<SlashCommand | null>(null);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  const hasMessage = Boolean(value?.trim()?.length);
  const hasContentBlocks = contentBlocks.length > 0;
  const hasAttachments = hasContentBlocks || annotations.length > 0;
  const isSendDisabled = disabled || (!hasMessage && !hasAttachments);
  const isExpanded = forceExpanded || hasAttachments || isMultiline;

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

  useLayoutEffect(() => {
    const editorEl = editorRef.current;
    if (!editorEl) return;
    const textContent = editorEl.textContent ?? "";
    if ((value ?? "") !== textContent) {
      editorEl.textContent = value ?? "";
    }
    const frame = requestAnimationFrame(() => {
      setIsMultiline(editorHasMultipleLines(editorEl, value ?? ""));
    });
    return () => cancelAnimationFrame(frame);
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
      const event = new Event("change", {
        bubbles: true,
      }) as unknown as React.ChangeEvent<HTMLInputElement>;
      Object.defineProperty(event, "target", {
        writable: false,
        value: input,
      });
      onFileUpload(event);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // NEW: Check if auth is required before submission
    if (onAuthRequired && value?.trim()) {
      onAuthRequired(value.trim());
      return;
    }

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
    setIsMultiline(editorHasMultipleLines(editor, text));

    // Get accurate cursor position in contentEditable
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    // Calculate cursor position by counting characters before the cursor
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editor);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const cursorPosition = preCaretRange.toString().length;

    // Parse for slash commands
    const command = parseSlashCommand(text, cursorPosition);

    if (command?.type === "model") {
      setActiveCommand(command);
      setModelSelectorOpen(true);
    } else if (modelSelectorOpen) {
      // Close if command is cleared
      setActiveCommand(null);
      setModelSelectorOpen(false);
    }
  };

  const handlePasteEvent = (event: React.ClipboardEvent<HTMLDivElement>) => {
    // Prevent default paste to avoid rendering HTML in contentEditable
    event.preventDefault();

    // Get plain text only
    const text = event.clipboardData.getData("text/plain");

    // Insert plain text at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));

      // Move cursor to end of inserted text
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // Emit the change
    if (editorRef.current) {
      emitChange(editorRef.current.textContent || "");
    }

    onPaste?.(event);
  };

  const handleKeyDownEvent = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // If model selector is open, don't handle Enter (let selector handle it)
    if (modelSelectorOpen && event.key === "Enter") {
      event.preventDefault();
      return;
    }

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

  // Handle model selection from popover
  const handleModelSelect = (model: Model) => {
    // Clear the command text entirely (model chip will show selection)
    const newText =
      activeCommand && value
        ? replaceCommand(value, activeCommand, "").newText
        : (value ?? "");

    if (activeCommand) onChange?.(newText);
    onModelSelect?.(model);
    setModelSelectorOpen(false);
    setActiveCommand(null);

    // Update contentEditable and focus
    requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (!editor) return;

      editor.textContent = newText;
      editor.focus();

      // Place cursor at end
      const selection = window.getSelection();
      const range = document.createRange();

      if (selection) {
        range.selectNodeContents(editor);
        range.collapse(false); // Collapse to end
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  };

  return (
    <DragAndDropWrapper onFileDrop={handleFileDrop}>
      <div
        className={cn(
          "doot-composer group/composer text-foreground w-full overflow-hidden",
          className,
        )}
        data-expanded={isExpanded}
        data-radius="composer"
      >
        <AnnotationChip />
        <ApprovalPanel model={selectedModel?.id} />
        <form
          onSubmit={handleFormSubmit}
          className={cn(
            "grid w-full transition-all duration-300 ease-out",
            "grid-cols-[auto_minmax(0,1fr)_auto]",
            // Collapsed: [leading | primary | trailing]
            // Expanded: primary full width on top, then [leading | . | trailing]
            "[grid-template-areas:'leading_primary_trailing']",
            "group-data-[expanded=true]/composer:[grid-template-areas:'primary_primary_primary'_'leading_footer_trailing']",
            // Dynamic padding: reduced when collapsed, normal when expanded
            "gap-2 p-2 group-data-[expanded=true]/composer:p-2",
          )}
        >
          {/* Leading Area - Plus Button + Segmented Control */}
          <div
            className={cn(
              "doot-composer-leading flex min-w-0 items-center gap-1 transition-all duration-300 [grid-area:leading]",
              "group-data-[expanded=true]/composer:mb-0",
            )}
            style={{ transformOrigin: "50% 100%" }}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Popover
                    open={showPlusPopover}
                    onOpenChange={setShowPlusPopover}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-doot-composer-action="true"
                        className="text-muted-foreground hover:bg-muted hover:text-foreground h-doot-control w-doot-control flex shrink-0 cursor-pointer items-center justify-center bg-transparent p-0 transition-colors"
                        type="button"
                        aria-label="Add attachments or connectors"
                      >
                        <PlusIcon size={24} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-[250px] p-2"
                      sideOffset={8}
                    >
                      <button
                        onClick={() => {
                          handleAttachmentClick();
                          setShowPlusPopover(false);
                        }}
                        data-radius="control"
                        className="hover:bg-accent flex w-full items-center gap-3 p-2 text-sm transition-colors"
                        type="button"
                      >
                        <div
                          data-radius="surface"
                          className="bg-primary/10 text-primary flex h-8 w-8 flex-shrink-0 items-center justify-center"
                        >
                          <Paperclip className="h-4 w-4" />
                        </div>
                        <div className="flex flex-1 flex-col items-start">
                          <span className="font-medium">Upload files</span>
                          <span className="text-muted-foreground text-xs">
                            Images, PDFs, and more
                          </span>
                        </div>
                      </button>
                    </PopoverContent>
                  </Popover>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Add attachments or connectors</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Vertical divider - instant show/hide via display, no transition */}
            <div className="bg-border h-5 w-px flex-shrink-0 group-data-[expanded=true]/composer:hidden" />
          </div>

          <div
            className="doot-composer-config"
            role="group"
            aria-label="Composer configuration"
          >
            {config.features.localAgentEnabled && <WorkspaceSelector />}
            <SimpleAgentSelector />
            <ModelSelectorPopover
              open={modelSelectorOpen}
              onOpenChange={setModelSelectorOpen}
              searchQuery={activeCommand?.query ?? ""}
              autoFocusSearch={!activeCommand}
              onSelect={handleModelSelect}
              models={availableModels}
              selectedModelId={selectedModel?.id}
              trigger={
                <button
                  type="button"
                  className="doot-model-chip text-muted-foreground hover:text-foreground focus-visible:ring-ring/40 flex cursor-pointer items-center gap-1.5 px-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2"
                  data-radius="control"
                  aria-label={`Select model${selectedModel ? `: ${selectedModel.name}` : ""}`}
                  aria-haspopup="listbox"
                  aria-expanded={modelSelectorOpen}
                  title={selectedModel?.name ?? "Select model"}
                >
                  <span className="relative size-4 shrink-0">
                    <ModelProviderIcon
                      provider={selectedModel?.provider ?? "custom"}
                      className="size-4"
                    />
                  </span>
                  <span className="max-w-[100px] truncate">
                    {selectedModel?.name ?? "Model"}
                  </span>
                  {selectedModel?.source === "local" && (
                    <span className="bg-muted text-muted-foreground text-doot-fine shrink-0 rounded-full px-1.5 py-0.5 font-medium leading-none">
                      Local
                    </span>
                  )}
                  <ChevronDownIcon
                    size="xs"
                    className={cn(
                      "shrink-0 transition-transform duration-150",
                      modelSelectorOpen && "rotate-180",
                    )}
                  />
                </button>
              }
            />
            <PermissionSelector />
          </div>

          {/* Primary Area - Editor + Attachments + Connected Apps */}
          <div
            data-doot-composer-primary="true"
            className={cn(
              "flex w-full min-w-0 transition-all duration-300 [grid-area:primary]",
              "group-data-[expanded=false]/composer:items-center",
              "group-data-[expanded=true]/composer:mb-0.5 group-data-[expanded=true]/composer:items-start",
              hasContentBlocks ? "flex-col gap-2" : "flex-row items-center",
            )}
            style={{ transformOrigin: "0% 100%" }}
          >
            {hasContentBlocks && (
              <div className="flex w-full flex-wrap items-start gap-2">
                <ContentBlocksPreview
                  blocks={contentBlocks}
                  onRemove={onRemoveBlock || (() => {})}
                />
              </div>
            )}
            {/* Wrapper with transitioning max-height for smooth expansion/collapse */}
            <div
              data-doot-composer-editor-shell="true"
              className={cn(
                "relative w-full transition-all duration-300 ease-out",
                "group-data-[expanded=false]/composer:overflow-hidden",
                "group-data-[expanded=false]/composer:flex group-data-[expanded=false]/composer:items-center",
                "group-data-[expanded=true]/composer:overflow-visible",
              )}
              data-radius="surface"
              style={{
                maxHeight: isExpanded ? "208px" : "44px",
              }}
            >
              {!hasMessage && (
                <span
                  className={cn(
                    "text-muted-foreground pointer-events-none absolute left-3 z-10 text-base select-none",
                    "group-data-[expanded=false]/composer:top-1/2 group-data-[expanded=false]/composer:-translate-y-1/2",
                    "group-data-[expanded=true]/composer:top-3",
                  )}
                >
                  {placeholder}
                </span>
              )}

              {/* Top gradient fade - only when expanded and NOT on glass */}
              <div
                className={cn(
                  "pointer-events-none absolute top-0 right-0 left-0 z-10 h-3 bg-gradient-to-b to-transparent opacity-0 transition-opacity group-data-[expanded=true]/composer:opacity-100",
                  isGlass ? "hidden" : "from-card",
                )}
              />

              <div
                ref={editorRef}
                data-doot-composer-editor="true"
                contentEditable={!disabled}
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                aria-disabled={disabled}
                aria-label={placeholder}
                aria-placeholder={placeholder}
                onInput={handleInput}
                onPaste={handlePasteEvent}
                onKeyDown={handleKeyDownEvent}
                className={cn(
                  "w-full overflow-y-auto text-base leading-6 break-words whitespace-pre-wrap outline-none",
                  "disabled:text-muted-foreground disabled:cursor-not-allowed",
                  "group-data-[expanded=false]/composer:min-h-0 group-data-[expanded=false]/composer:px-3 group-data-[expanded=false]/composer:py-2",
                  "group-data-[expanded=true]/composer:max-h-40 group-data-[expanded=true]/composer:min-h-[56px] group-data-[expanded=true]/composer:px-3 group-data-[expanded=true]/composer:py-3",
                )}
              />

              {/* Bottom gradient fade - only when expanded and NOT on glass */}
              <div
                className={cn(
                  "pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-3 bg-gradient-to-t to-transparent opacity-0 transition-opacity group-data-[expanded=true]/composer:opacity-100",
                  isGlass ? "hidden" : "from-card",
                )}
              />
            </div>
          </div>

          {/* Trailing Area - Send/Stop only. Model is composer configuration. */}
          <div
            className={cn(
              "flex items-center justify-end gap-2 transition-all duration-300 [grid-area:trailing]",
            )}
            style={{ transformOrigin: "50% 50%" }}
          >
            <div
              data-doot-composer-submit-shell="true"
              className="h-doot-control w-doot-control relative shrink-0"
            >
              {isLoading && isSendDisabled ? (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isStopping}
                  aria-label={isStopping ? "Stopping agent" : "Stop agent"}
                  title={isStopping ? "Stopping…" : "Stop"}
                  data-radius="control"
                  data-doot-composer-action="true"
                  className="bg-foreground text-background focus-visible:ring-ring/50 absolute inset-0 z-50 flex items-center justify-center transition duration-200 hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-70"
                >
                  {isStopping ? (
                    <LoaderIcon className="animate-spin" />
                  ) : (
                    <StopIcon />
                  )}
                </button>
              ) : (
                <button
                  disabled={isSendDisabled}
                  type="submit"
                  aria-label="Send message"
                  data-radius="control"
                  data-doot-composer-action="true"
                  className="bg-foreground text-background focus-visible:ring-ring/50 disabled:bg-muted disabled:text-muted-foreground absolute inset-0 z-50 flex items-center justify-center transition duration-200 hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ChevronUpIcon
                    size="sm"
                    strokeWidth={2.3}
                    className="transition-all duration-200"
                  />
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
