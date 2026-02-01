"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { SimpleAgentSelector } from "./agent-selector";
import { DragAndDropWrapper } from "./drag-drop-wrapper";
import { StopIcon } from "@/components/icons";
import { ModelSelectorPopover } from "@/components/ui/model-selector-popover";
import { ToolkitSelectorPopover } from "@/components/ui/toolkit-selector-popover";
import { parseSlashCommand, replaceCommand } from "@/lib/slash-command-parser";
import type { SlashCommand } from "@/lib/slash-command-parser";
import type { Model } from "@/types/model";
import type { SelectedToolkit } from "@/types/mcp-toolkit";
import { ContentBlocksPreview } from "./messages/ContentBlocksPreview";
import { ToolkitChips } from "./toolkit-chips";
import { SelectedToolkitsDialog } from "./selected-toolkits-dialog";
import { useSelectedToolkits } from "@/hooks/use-selected-toolkits";
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

// Provider icons for model display
const ProviderIcon = ({
  provider,
  className,
}: {
  provider: string;
  className?: string;
}) => {
  switch (provider) {
    case "openai":
      return (
        <svg
          viewBox="0 0 24 24"
          className={cn("h-4 w-4", className)}
          fill="currentColor"
        >
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
        </svg>
      );
    case "anthropic":
      return (
        <svg
          viewBox="0 0 24 24"
          className={cn("h-4 w-4", className)}
          fill="currentColor"
        >
          <path d="M17.3037 3.293h3.1716L13.0257 20.707h-3.1696l7.4476-17.414Zm-10.6074 0H3.525l7.4476 17.414h3.1696L6.6963 3.293Z" />
        </svg>
      );
    case "google":
      return (
        <svg
          viewBox="0 0 24 24"
          className={cn("h-4 w-4", className)}
          fill="currentColor"
        >
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      );
    default:
      return (
        <svg
          viewBox="0 0 24 24"
          className={cn("h-4 w-4", className)}
          fill="currentColor"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M12 8v4l3 3"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      );
  }
};

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

  // Toolkit management (lifted state)
  selectedToolkits?: SelectedToolkit[];
  onToggleToolkit?: (toolkit: SelectedToolkit) => void;
  onRemoveToolkit?: (toolkitId: string) => void;
  isToolkitSelected?: (toolkitId: string) => boolean;
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

  // Default props for toolkits (optional to allow gradual migration or fallback)
  selectedToolkits = [],
  onToggleToolkit,
  onRemoveToolkit,
  isToolkitSelected,
}: ComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [showManagerDialog, setShowManagerDialog] = useState(false);
  const [showPlusPopover, setShowPlusPopover] = useState(false);

  // Model selector state
  const [activeCommand, setActiveCommand] = useState<SlashCommand | null>(null);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  // Toolkit selector state
  const [toolkitSelectorOpen, setToolkitSelectorOpen] = useState(false);
  const [toolkitsDialogOpen, setToolkitsDialogOpen] = useState(false);

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
  const isExpanded = hasMessage || hasAttachments || selectedToolkits.length > 0;

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
      setToolkitSelectorOpen(false);
    } else if (command?.type === "toolkit") {
      setActiveCommand(command);
      setToolkitSelectorOpen(true);
      setModelSelectorOpen(false);
    } else {
      // Close if command is cleared
      if (modelSelectorOpen || toolkitSelectorOpen) {
        setActiveCommand(null);
        setModelSelectorOpen(false);
        setToolkitSelectorOpen(false);
      }
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
    // If model or toolkit selector is open, don't handle Enter (let selector handle it)
    if ((modelSelectorOpen || toolkitSelectorOpen) && event.key === "Enter") {
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

    // Clear the command text entirely (model chip will show selection)
    const { newText } = replaceCommand(
      value,
      activeCommand,
      "", // Replace with empty string, not the model id
    );

    onChange?.(newText);
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

  // Handle toolkit selection from popover
  const handleToolkitSelect = (toolkit: SelectedToolkit) => {
    onToggleToolkit?.(toolkit);
    // Don't close - allow multiple selection

    // Reset the search query to empty string (remove "/play" and "/")
    if (activeCommand && value) {
      const { newText } = replaceCommand(
        value,
        activeCommand,
        "", // Remove entirely
      );

      onChange?.(newText);
      setActiveCommand(null); // Clear command state
      setToolkitSelectorOpen(false); // Close the popover

      // Update contentEditable and focus
      requestAnimationFrame(() => {
        const editor = editorRef.current;
        if (!editor) return;

        editor.textContent = newText;
        editor.focus();

        const selection = window.getSelection();
        const range = document.createRange();

        if (selection) {
          range.selectNodeContents(editor);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      });
    }
  };

  // Handle toolkit selection done (close popover)
  const handleToolkitSelectionDone = () => {
    if (!activeCommand || !value) return;

    // Clear the command text
    const { newText } = replaceCommand(
      value,
      activeCommand,
      "",
    );

    onChange?.(newText);
    setToolkitSelectorOpen(false);
    setActiveCommand(null);

    // Update contentEditable and focus
    requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (!editor) return;

      editor.textContent = newText;
      editor.focus();

      const selection = window.getSelection();
      const range = document.createRange();

      if (selection) {
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  };

  return (
    <DragAndDropWrapper onFileDrop={handleFileDrop}>
      <div
        className={cn(
          "group/composer w-full border-border bg-card text-card-foreground transition-all duration-300 ease-out dark:bg-card dark:text-card-foreground",
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
                        className="hover:bg-accent/50 flex h-9 w-9 cursor-pointer items-center justify-center border border-border bg-transparent p-0 text-muted-foreground transition-colors hover:text-foreground"
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
                          className="flex w-full items-center gap-3 p-2 text-sm transition-colors hover:bg-accent"
                          type="button"
                        >
                          <div
                            data-radius="radius2"
                            className="bg-primary/10 flex h-8 w-8 flex-shrink-0 items-center justify-center text-primary"
                          >
                            <Paperclip className="h-4 w-4" />
                          </div>
                          <div className="flex flex-1 flex-col items-start">
                            <span className="font-medium">Upload files</span>
                            <span className="text-xs text-muted-foreground">
                              Images, PDFs, and more
                            </span>
                          </div>
                        </button>
                      </div>

                      <Separator />

                      {/* Connectors Section */}
                      <div className="p-2">
                        <div className="mb-1.5 px-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Quick Connect
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {quickIntegrations.map((integration) => (
                            <button
                              key={integration.id}
                              data-radius="radius1"
                              className="flex w-full items-center gap-3 px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                              onClick={() => {
                                setShowManagerDialog(true);
                                setShowPlusPopover(false);
                              }}
                              type="button"
                            >
                              <div
                                data-radius="radius2"
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden border border-border bg-card"
                              >
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
                                  <div className="h-4 w-4 rounded bg-muted" />
                                )}
                              </div>
                              <span className="flex-1 truncate text-left font-medium">
                                {integration.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Connect
                              </span>
                            </button>
                          ))}
                        </div>

                        <button
                          data-radius="radius1"
                          className="flex w-full items-center gap-3 p-1.5 text-sm transition-colors hover:bg-accent"
                          onClick={() => {
                            setShowManagerDialog(true);
                            setShowPlusPopover(false);
                          }}
                          type="button"
                        >
                          <div
                            data-radius="radius2"
                            className="bg-muted/50 flex h-8 w-8 flex-shrink-0 items-center justify-center"
                          >
                            <Plug2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="flex-1 text-left font-medium text-muted-foreground">
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

            <SimpleAgentSelector className="flex-1" />
          </div>

          {/* Primary Area - Editor + Attachments + Connected Apps */}
          <div
            className={cn(
              "flex w-full transition-all duration-300 [grid-area:primary]",
              "group-data-[expanded=false]/composer:items-center",
              "group-data-[expanded=true]/composer:mb-0.5 group-data-[expanded=true]/composer:items-start",
              hasAttachments || selectedToolkits.length > 0
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
            {/* Selected Toolkits */}
            {selectedToolkits.length > 0 && (
              <div className="flex w-full items-start px-1">
                <ToolkitChips
                  toolkits={selectedToolkits}
                  onRemove={onRemoveToolkit || (() => {})}
                  onViewAll={() => setToolkitsDialogOpen(true)}
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
                    "text-muted-foreground/60 pointer-events-none absolute left-2 z-10 text-sm",
                    "group-data-[expanded=false]/composer:top-1/2 group-data-[expanded=false]/composer:-translate-y-1/2",
                    "group-data-[expanded=true]/composer:top-1.5",
                  )}
                >
                  {placeholder}
                </span>
              )}

              {/* Top gradient fade (only 3px) - only when expanded */}
              <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-3 bg-gradient-to-b from-card to-transparent opacity-0 transition-opacity group-data-[expanded=true]/composer:opacity-100" />

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
                  "w-full overflow-y-auto whitespace-pre-wrap break-words text-base outline-none",
                  "disabled:cursor-not-allowed disabled:text-muted-foreground",
                  "group-data-[expanded=false]/composer:min-h-0 group-data-[expanded=false]/composer:p-2",
                  "group-data-[expanded=true]/composer:max-h-40 group-data-[expanded=true]/composer:min-h-[32px] group-data-[expanded=true]/composer:px-2 group-data-[expanded=true]/composer:py-1",
                )}
              />

              {/* Bottom gradient fade - only when expanded */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-3 bg-gradient-to-t from-card to-transparent opacity-0 transition-opacity group-data-[expanded=true]/composer:opacity-100" />
            </div>
          </div>

          {/* Trailing Area - Selected Model Chip + Send/Stop Button */}
          <div
            className={cn(
              "flex items-center justify-end gap-2 transition-all duration-300 [grid-area:trailing]",
            )}
            style={{ transformOrigin: "50% 50%" }}
          >
            {/* Selected Model Chip - only show when model is explicitly selected */}
            {selectedModel && (
              <button
                type="button"
                onClick={() => onModelSelect?.(null as unknown as Model)}
                className="group/model-chip bg-accent/50 hover:bg-destructive/10 flex cursor-pointer items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
                data-radius="radius2"
                aria-label={`Remove ${selectedModel.name}`}
              >
                {/* Provider Icon - changes to X on hover */}
                <span className="relative h-3.5 w-3.5 flex-shrink-0">
                  {/* Provider Icon - hidden on hover */}
                  <span className="block group-hover/model-chip:hidden">
                    <ProviderIcon
                      provider={selectedModel.provider}
                      className="h-3.5 w-3.5"
                    />
                  </span>
                  {/* X Icon - shown on hover */}
                  <svg
                    viewBox="0 0 24 24"
                    className="hidden h-3.5 w-3.5 group-hover/model-chip:block"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </span>
                <span className="max-w-[100px] truncate">
                  {selectedModel.name}
                </span>
              </button>
            )}

            <div className="relative h-9 w-9">
              {isLoading ? (
                <button
                  type="button"
                  onClick={onCancel}
                  aria-label="Cancel"
                  data-radius="radius2"
                  className="focus-visible:ring-ring/50 absolute inset-0 z-50 flex items-center justify-center bg-black text-white transition duration-200 hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <StopIcon />
                </button>
              ) : (
                <button
                  disabled={isSendDisabled}
                  type="submit"
                  data-radius="radius3"
                  className="focus-visible:ring-ring/50 absolute inset-0 z-50 flex items-center justify-center bg-black text-white transition duration-300 hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 disabled:bg-gray-200 disabled:text-gray-500 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
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

      {/* Toolkit Selector Popover */}
      <ToolkitSelectorPopover
        open={toolkitSelectorOpen}
        onOpenChange={(open) => {
          setToolkitSelectorOpen(open);
          if (!open) {
            handleToolkitSelectionDone();
          }
        }}
        searchQuery={activeCommand?.type === "toolkit" ? activeCommand.query : ""}
        onSelect={handleToolkitSelect}
        selectedToolkitIds={selectedToolkits.map((t) => t.id)}
        anchorEl={editorRef.current}
      />

      {/* Selected Toolkits Dialog */}
      <SelectedToolkitsDialog
        open={toolkitsDialogOpen}
        onOpenChange={setToolkitsDialogOpen}
        toolkits={selectedToolkits}
        onToggle={(toolkit) => onToggleToolkit?.(toolkit)}
      />
    </DragAndDropWrapper>
  );
}
