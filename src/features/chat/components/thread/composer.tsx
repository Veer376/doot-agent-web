"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { ComposerSegmentedControl } from "./composer-segmented-control";
import { DragAndDropWrapper } from "./drag-drop-wrapper";
import { CancelIcon } from "@/components/icons";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { ContentBlocksPreview } from "./messages/ContentBlocksPreview";
import { cn } from "@/lib/utils";
import { useAgentContext } from "@/features/chat/providers/Stream";

interface ComposerProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit?: (e: React.FormEvent) => void;
  onCancel?: () => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  contentBlocks?: any[];
  onRemoveBlock?: (index: number) => void;
  onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
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
}: ComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // PHASE 4: Use isChatMode from context instead of checking agentId
  const { isChatMode } = useAgentContext();

  // Check if we're in "Chat" mode (no agent selected)
  const isSendDisabled = disabled || !value || isChatMode;

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload?.(e);
      // Reset the input so the same file can be selected again
      e.target.value = "";
    }
  };

  const handleFileDrop = (files: FileList) => {
    // Create a synthetic event for the file upload handler
    const input = fileInputRef.current;
    if (input && onFileUpload) {
      // Create a new DataTransfer to hold our files
      const dataTransfer = new DataTransfer();
      for (let i = 0; i < files.length; i++) {
        dataTransfer.items.add(files[i]);
      }
      input.files = dataTransfer.files;

      // Create synthetic event
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

  return (
    <DragAndDropWrapper onFileDrop={handleFileDrop}>
      <div //container-textfield-radius, padding except at the top.
        className={cn(
          "focus-within:border-aui-ring/20 flex min-h-[64px] w-full flex-col overflow-clip rounded-3xl border bg-white p-2 shadow-sm transition-colors ease-in",
          className,
        )}
      >
        {/* File Attachments Section - Top */}
        {contentBlocks.length > 0 && (
          <div className="mr-auto flex flex-wrap items-start gap-2 pt-2">
            <ContentBlocksPreview
              blocks={contentBlocks}
              onRemove={onRemoveBlock || (() => {})}
            />
          </div>
        )}

        <form
          onSubmit={handleFormSubmit}
          className="flex w-full flex-col"
        >
          {/* Text Field Section - Middle (grows/shrinks independently) */}
          <div className="flex min-h-0 flex-1">
            <textarea
              name="input"
              value={value}
              onChange={onChange}
              onPaste={onPaste}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="placeholder:text-muted-foreground field-sizing-content max-h-52 w-full flex-1 resize-none border-none bg-transparent px-2 py-4 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed"
            />
          </div>

          {/* Actions Bar Section - Bottom (fixed height) */}
          <div className="flex w-full flex-row items-center justify-between p-0.5">
            {/* Left: Segmented Control (Attach + Agent/Chat) */}
            <div className="flex-shrink-0">
              <ComposerSegmentedControl onFileUpload={onFileUpload} />
            </div>

            {/* Right: Send/Cancel Button button got replaced with acertinity animated design. */}
            <div className="relative h-8 flex-shrink-0">
              {isLoading ? (
                <button
                  type="button"
                  onClick={onCancel}
                  aria-label="Cancel"
                  className="relative top-1/2 z-50 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black text-white transition duration-200 hover:bg-black/90 dark:bg-zinc-900"
                >
                  <CancelIcon />
                </button>
              ) : (
                <button
                  disabled={isSendDisabled}
                  type="submit"
                  className="relative top-1/2 z-50 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black transition duration-300 disabled:bg-gray-200 dark:bg-zinc-900 dark:disabled:bg-zinc-800"
                >
                  <motion.svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-white"
                  >
                    <path
                      stroke="none"
                      d="M0 0h24v24H0z"
                      fill="none"
                    />

                    {/* Animated line: reveals when there's input */}
                    <motion.path
                      d="M5 12l14 0"
                      initial={{
                        strokeDasharray: "50%",
                        strokeDashoffset: "50%",
                      }}
                      animate={{
                        strokeDashoffset: value ? 0 : "70%",
                      }}
                      transition={{
                        duration: 0.5,
                        ease: "linear",
                      }}
                    />

                    {/* Arrowhead */}
                    <path d="M13 18l6 -6" />
                    <path d="M13 6l6 6" />
                  </motion.svg>
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          className="hidden"
        />
      </div>
    </DragAndDropWrapper>
  );
}
