"use client";

import React, { useRef } from "react";
import { ComposerActionsPopOut } from "./composer-actions-popout";
import { DragAndDropWrapper } from "./drag-drop-wrapper";
import { SendIcon, CancelIcon } from "@/components/icons";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { ContentBlocksPreview } from "./messages/ContentBlocksPreview";
import { cn } from "@/lib/utils";

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
      <div
        className={cn(
          "focus-within:border-aui-ring/20 flex min-h-[64px] w-full flex-col rounded-2xl border bg-white px-2.5 shadow-sm transition-colors ease-in",
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
          <div className="w-full flex-1 px-2">
            <textarea
              name="input"
              value={value}
              onChange={onChange}
              onPaste={onPaste}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="placeholder:text-muted-foreground field-sizing-content max-h-40 w-full resize-none border-none bg-transparent py-4 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed"
            />
          </div>

          {/* Actions Bar Section - Bottom (fixed height) */}
          <div className="flex w-full flex-row items-center justify-between py-2">
            {/* Left: ComposerActionsPopOut */}
            <div className="flex-shrink-0">
              <ComposerActionsPopOut onFileUpload={onFileUpload} />
            </div>

            {/* Right: Send/Cancel Button */}
            <div className="flex-shrink-0">
              {isLoading ? (
                <TooltipIconButton
                  tooltip="Cancel"
                  variant="default"
                  className="p-2 transition-opacity ease-in"
                  type="button"
                >
                  <CancelIcon size="lg" />
                </TooltipIconButton>
              ) : (
                <TooltipIconButton
                  tooltip="Send"
                  variant="default"
                  className="p-2 transition-opacity ease-in"
                  type="submit"
                  disabled={disabled}
                >
                  <SendIcon size="lg" />
                </TooltipIconButton>
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
