"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { ComposerSegmentedControl } from "./composer-segmented-control";
import { DragAndDropWrapper } from "./drag-drop-wrapper";
import { StopIcon } from "@/components/icons";
import { ModelSelectorPopover } from "@/components/ui/model-selector-popover";
import { parseSlashCommand, replaceCommand } from "@/lib/slash-command-parser";
import type { SlashCommand } from "@/lib/slash-command-parser";
import type { Model } from "@/types/model";
import { ContentBlocksPreview } from "./messages/ContentBlocksPreview";
import { cn } from "@/lib/utils";
import { ComposioManagerDialog } from "../composio";
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
import { Paperclip, Plug2 } from "lucide-react";
import { PlusIcon } from "@/components/icons";
import { useComposioToolkitIcon } from "@/lib/composio/hooks";
import { Separator } from "@/components/ui/separator";

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
  contentBlocks?: import("@/types/multimodal").Base64ContentBlock[];
  onRemoveBlock?: (index: number) => void;
  onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  focusKey?: string | null;

  selectedModel?: Model | null;
  onModelSelect?: (model: Model) => void;
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
  contentBlocks = [],
  onRemoveBlock,
  onFileUpload,
  className,
  focusKey,

  selectedModel,
  onModelSelect,
}: ComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [showManagerDialog, setShowManagerDialog] = useState(false);
  const [showPlusPopover, setShowPlusPopover] = useState(false);
  
  // Model selector state
  const [activeCommand, setActiveCommand] = useState<SlashCommand | null>(null);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  // Define quick integrations
  const quickIntegrations = useMemo(
    () => [
      { id: "gmail", name: "Gmail", slug: "gmail" },
      { id: "slack", name: "Slack", slug: "slack" },
      { id: "notion", name: "Notion", slug: "notion" },
    ],
    [],
  );

  // Fetch integration icons
  const { data: gmailIcon } = useComposioToolkitIcon("gmail");
  const { data: slackIcon } = useComposioToolkitIcon("slack");
  const { data: notionIcon } = useComposioToolkitIcon("notion");

  // Map icons to integrations
  const integrationIcons = useMemo(
    () => ({
      gmail: gmailIcon?.icon_url,
      slack: slackIcon?.icon_url,
      notion: notionIcon?.icon_url,
    }),
    [gmailIcon, slackIcon, notionIcon],
  );

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
      const event = new Event("change", { bubbles: true }) as unknown as React.ChangeEvent<HTMLInputElement>;
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
    if (!activeCommand || !value) return;
    
    const replacement = `>${model.id} `;
    const { newText, newCursorPosition } = replaceCommand(
      value,
      activeCommand,
      replacement
    );
    
    onChange?.(newText);
    onModelSelect?.(model);
    setModelSelectorOpen(false);
    setActiveCommand(null);
    
    // Update contentEditable and restore cursor
    requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (!editor) return;
      
      editor.textContent = newText;
      editor.focus();
      
      // Set cursor position
      const selection = window.getSelection();
      const range = document.createRange();
      const textNode = editor.firstChild;
      
      if (textNode && selection) {
        range.setStart(textNode, Math.min(newCursorPosition, textNode.textContent?.length ?? 0));
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  };

  return (
    <DragAndDropWrapper onFileDrop={handleFileDrop}>
      <div
        className={cn(
          "group/composer bg-card text-card-foreground dark:bg-card dark:text-card-foreground border-border w-full transition-all duration-300 ease-out",
          "focus-within:border-primary/30 overflow-hidden border shadow-sm",
          className,
        )}
        data-expanded={isExpanded}
        data-radius="radius3"
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
            "gap-2 p-2 group-data-[expanded=true]/composer:p-2",
          )}
        >
          {/* Leading Area - Plus Button + Segmented Control */}
          <div
            className={cn(
              "flex items-center gap-2 transition-all duration-300 [grid-area:leading]",
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
                        variant="outline"
                        size="sm"
                        data-radius="radius3"
                        className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 flex h-9 w-9 cursor-pointer items-center justify-center border bg-transparent p-0 transition-colors"
                        type="button"
                      >
                        <PlusIcon size={32} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-[250px] p-0"
                      sideOffset={8}
                    >
                      {/* Attachments Section */}
                      <div className="p-2">
                        <button
                          onClick={() => {
                            handleAttachmentClick();
                            setShowPlusPopover(false);
                          }}
                          data-radius="radius1"
                          className="hover:bg-accent flex w-full items-center gap-3 p-2 text-sm transition-colors"
                          type="button"
                        >
                          <div className="bg-primary/10 text-primary flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg">
                            <Paperclip className="h-4 w-4" />
                          </div>
                          <div className="flex flex-1 flex-col items-start">
                            <span className="font-medium">Upload files</span>
                            <span className="text-muted-foreground text-xs">
                              Images, PDFs, and more
                            </span>
                          </div>
                        </button>
                      </div>

                      <Separator />

                      {/* Connectors Section */}
                      <div className="p-2">
                        <div className="mb-1.5 px-2">
                          <span className="text-muted-foreground text-xs font-medium">
                            Quick Connect
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {quickIntegrations.map((integration) => (
                            <button
                              key={integration.id}
                              data-radius="radius1"
                              className="hover:bg-accent flex w-full items-center gap-3 px-2 py-1.5 text-sm transition-colors"
                              onClick={() => {
                                setShowManagerDialog(true);
                                setShowPlusPopover(false);
                              }}
                              type="button"
                            >
                              <div className="bg-card border-border flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border">
                                {integrationIcons[
                                  integration.id as keyof typeof integrationIcons
                                ] ? (
                                  <img
                                    src={
                                      integrationIcons[
                                        integration.id as keyof typeof integrationIcons
                                      ]
                                    }
                                    alt={integration.name}
                                    className="h-4 w-4 object-contain"
                                  />
                                ) : (
                                  <div className="bg-muted h-4 w-4 rounded" />
                                )}
                              </div>
                              <span className="flex-1 truncate text-left font-medium">
                                {integration.name}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                Connect
                              </span>
                            </button>
                          ))}
                        </div>

                        <button
                          data-radius="radius1"
                          className="hover:bg-accent flex w-full items-center gap-3 p-1.5 text-sm transition-colors"
                          onClick={() => {
                            setShowManagerDialog(true);
                            setShowPlusPopover(false);
                          }}
                          type="button"
                        >
                          <div className="bg-muted/50 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg">
                            <Plug2 className="text-muted-foreground h-4 w-4" />
                          </div>
                          <span className="text-muted-foreground flex-1 text-left font-medium">
                            Browse all integrations
                          </span>
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Add attachments or connectors</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <ComposerSegmentedControl className="max-w-[240px] flex-1" />
          </div>

          {/* Primary Area - Editor + Attachments + Connected Apps */}
          <div
            className={cn(
              "flex w-full transition-all duration-300 [grid-area:primary]",
              "group-data-[expanded=false]/composer:items-center",
              "group-data-[expanded=true]/composer:mb-0.5 group-data-[expanded=true]/composer:items-start",
              hasAttachments
                ? "flex-col gap-2"
                : "flex-row items-center",
            )}
            style={{ transformOrigin: "0% 100%" }}
          >

            {hasAttachments && (
              <div className="flex w-full flex-wrap items-start gap-2">
                <ContentBlocksPreview
                  blocks={contentBlocks}
                  onRemove={onRemoveBlock || (() => {})}
                />
              </div>
            )}
            {/* Wrapper with transitioning max-height for smooth expansion/collapse */}
            <div
              className={cn(
                "relative w-full transition-all duration-300 ease-out",
                "group-data-[expanded=false]/composer:overflow-hidden",
                "group-data-[expanded=false]/composer:flex group-data-[expanded=false]/composer:items-center",
                "group-data-[expanded=true]/composer:overflow-visible",
              )}
              data-radius="radius2"
              style={{
                maxHeight: isExpanded ? "208px" : "44px",
              }}
            >
              {!hasMessage && !hasAttachments && (
                <span
                  className={cn(
                    "text-muted-foreground/60 pointer-events-none absolute left-2 text-sm z-10",
                    "group-data-[expanded=false]/composer:top-1/2 group-data-[expanded=false]/composer:-translate-y-1/2",
                    "group-data-[expanded=true]/composer:top-3",
                  )}
                >
                  {placeholder}
                </span>
              )}
              
              {/* Top gradient fade (only 3px) - only when expanded */}
              <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-3 bg-gradient-to-b from-card to-transparent opacity-0 group-data-[expanded=true]/composer:opacity-100 transition-opacity" />
              
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
                  "group-data-[expanded=true]/composer:max-h-40 group-data-[expanded=true]/composer:min-h-[32px] group-data-[expanded=true]/composer:px-2 group-data-[expanded=true]/composer:py-1",
                )}
              />
              
              {/* Bottom gradient fade - only when expanded */}
              <div className="pointer-events-none absolute left-0 right-0 bottom-0 z-10 h-3 bg-gradient-to-t from-card to-transparent opacity-0 group-data-[expanded=true]/composer:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Trailing Area - Send/Stop Button */}
          <div
            className={cn(
              "flex items-center justify-end transition-all duration-300 [grid-area:trailing]",
            )}
            style={{ transformOrigin: "50% 50%" }}
          >
            <div className="relative h-9 w-9">
              {isLoading ? (
                <button
                  type="button"
                  onClick={onCancel}
                  aria-label="Cancel"
                  data-radius="radius2"
                  className="focus-visible:ring-ring/50 absolute inset-0 z-50 flex items-center justify-center bg-black text-white transition duration-200 hover:bg-black/90 focus-visible:ring-2 focus-visible:outline-none dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <StopIcon />
                </button>
              ) : (
                <button
                  disabled={isSendDisabled}
                  type="submit"
                  data-radius="radius3"
                  className="focus-visible:ring-ring/50 absolute inset-0 z-50 flex items-center justify-center bg-black text-white transition duration-300 hover:bg-black/90 focus-visible:ring-2 focus-visible:outline-none disabled:bg-gray-200 disabled:text-gray-500 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-white transition-all duration-500 ease-linear"
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

      <ComposioManagerDialog
        open={showManagerDialog}
        onOpenChange={setShowManagerDialog}
      />
      
      {/* Model Selector Popover */}
      <ModelSelectorPopover
        open={modelSelectorOpen}
        onOpenChange={setModelSelectorOpen}
        searchQuery={activeCommand?.query ?? ""}
        onSelect={handleModelSelect}
        selectedModelId={selectedModel?.id}
        anchorEl={editorRef.current}
      />
    </DragAndDropWrapper>
  );
}
