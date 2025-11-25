"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { ComposerSegmentedControl } from "./composer-segmented-control";
import { DragAndDropWrapper } from "./drag-drop-wrapper";
import { StopIcon } from "@/components/icons";
import { ContentBlocksPreview } from "./messages/ContentBlocksPreview";
import { cn } from "@/lib/utils";
import { ComposioAppSelector, ComposioManagerDialog } from "../composio";
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
import { Plus, Paperclip, Plug2 } from "lucide-react";
import { useComposioToolkitIcon } from "@/lib/composio/hooks";
import { Separator } from "@/components/ui/separator";

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
  selectedComposioProfiles?: string[];
  onComposioSelectionChange?: (profileIds: string[]) => void;
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
  selectedComposioProfiles = [],
  onComposioSelectionChange,
}: ComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [showManagerDialog, setShowManagerDialog] = useState(false);
  const [showPlusPopover, setShowPlusPopover] = useState(false);

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
          "group/composer bg-card text-card-foreground dark:bg-card dark:text-card-foreground border-border w-full rounded-3xl transition-all duration-300 ease-out",
          "focus-within:border-primary/30 overflow-hidden border shadow-sm",
          className,
        )}
        data-expanded={isExpanded}
        data-radius="radius2"
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
                        className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border bg-transparent p-0 transition-colors"
                        type="button"
                      >
                        <Plus className="h-4 w-4" />
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
                          className="hover:bg-accent flex w-full items-center gap-3 rounded-lg p-2 text-sm transition-colors"
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
                              className="hover:bg-accent flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors"
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
                          className="hover:bg-accent flex w-full items-center gap-3 rounded-lg p-1.5 text-sm transition-colors"
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
            {/* Composio app selector button: choose connections for this conversation */}
            <ComposioAppSelector
              selectedProfileIds={selectedComposioProfiles}
              onSelectionChange={onComposioSelectionChange || (() => {})}
              className="h-8 w-8"
            />
            <ComposerSegmentedControl className="max-w-[240px] flex-1" />
          </div>

          {/* Primary Area - Editor + Attachments + Connected Apps */}
          <div
            className={cn(
              "flex w-full transition-all duration-300 [grid-area:primary]",
              "group-data-[expanded=false]/composer:items-center",
              "group-data-[expanded=true]/composer:mb-2 group-data-[expanded=true]/composer:items-start",
              hasAttachments || selectedComposioProfiles.length > 0
                ? "flex-col gap-2"
                : "flex-row items-center",
            )}
            style={{ transformOrigin: "0% 100%" }}
          >
            {/* Selected Composio Apps */}
            {selectedComposioProfiles.length > 0 && (
              <div className="flex w-full flex-wrap items-center gap-2">
                <ComposioAppSelector
                  selectedProfileIds={selectedComposioProfiles}
                  onSelectionChange={onComposioSelectionChange || (() => {})}
                  displayMode="badges"
                />
              </div>
            )}
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
                  "group-data-[expanded=true]/composer:max-h-40 group-data-[expanded=true]/composer:min-h-[32px] group-data-[expanded=true]/composer:p-2",
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
            <div className="relative h-8 w-8">
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
                  data-radius="radius2"
                  className="focus-visible:ring-ring/50 absolute inset-0 z-50 flex items-center justify-center bg-black text-white transition duration-300 hover:bg-black/90 focus-visible:ring-2 focus-visible:outline-none disabled:bg-gray-200 disabled:text-gray-500 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
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

      <ComposioManagerDialog
        open={showManagerDialog}
        onOpenChange={setShowManagerDialog}
      />
    </DragAndDropWrapper>
  );
}
