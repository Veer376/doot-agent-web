import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Pdf01Icon, DocumentCodeIcon, CancelCircleIcon } from "hugeicons-react";
import type { Base64ContentBlock } from "@/types/multimodal";

export interface MultimodalPreviewProps {
  block: Base64ContentBlock;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export const MultimodalPreview: React.FC<MultimodalPreviewProps> = ({
  block,
  removable = false,
  onRemove,
  className,
  size = "md",
}) => {
  // Image block
  if (
    block.type === "image" &&
    block.source_type === "base64" &&
    typeof block.mime_type === "string" &&
    block.mime_type.startsWith("image/")
  ) {
    const url = `data:${block.mime_type};base64,${block.data}`;
    let imgClass: string = "object-cover h-16 w-16 text-lg";
    if (size === "sm") imgClass = "object-cover h-10 w-10 text-base";
    if (size === "lg") imgClass = "object-cover h-24 w-24 text-xl";
    if (size === "xl") imgClass = "object-cover h-32 w-32 text-2xl";
    return (
      <div className={cn("relative inline-block", className)}>
        <Image
          data-radius="radius2"
          src={url}
          alt={String(block.metadata?.name || "uploaded image")}
          className={imgClass}
          width={
            size === "sm" ? 16 : size === "md" ? 32 : size === "lg" ? 48 : 64
          }
          height={
            size === "sm" ? 16 : size === "md" ? 32 : size === "lg" ? 48 : 64
          }
        />
        {removable && (
          <button
            type="button"
            className="absolute top-1 right-1 z-10 transition-all hover:opacity-80 cursor-pointer"
            onClick={onRemove}
            aria-label="Remove image"
          >
            <CancelCircleIcon className="size-5 text-foreground" />
          </button>
        )}
      </div>
    );
  }

  // PDF block
  if (
    block.type === "file" &&
    block.source_type === "base64" &&
    block.mime_type === "application/pdf"
  ) {
    const filename =
      block.metadata?.filename || block.metadata?.name || "PDF file";
    return (
      <div
        data-radius="radius2"
        className={cn(
          "relative flex items-center gap-3 border border-border bg-accent/30 p-1.5 transition-colors",
          className,
        )}
      >
        <div data-radius="radius1" className="flex items-center justify-center size-9 bg-primary/10 flex-shrink-0">
          <Pdf01Icon
            className={cn(
              "text-primary",
              size === "sm" ? "size-4" : "size-5",
            )}
          />
        </div>
        <span
          className={cn("min-w-0 flex-1 text-sm text-foreground truncate pr-10")}
        >
          {String(filename)}
        </span>
        {removable && (
          <button
            type="button"
            className="absolute top-2 right-2 transition-all hover:opacity-80 cursor-pointer"
            onClick={onRemove}
            aria-label="Remove PDF"
          >
            <CancelCircleIcon className="size-5 text-foreground" />
          </button>
        )}
      </div>
    );
  }

  // Fallback for unknown types
  return (
    <div
      data-radius="radius2"
      className={cn(
        "relative flex items-center gap-3 border border-border bg-accent/30 px-4 py-3 text-muted-foreground transition-colors",
        className,
      )}
    >
      <div data-radius="radius1" className="flex items-center justify-center size-9 bg-muted flex-shrink-0">
        <DocumentCodeIcon className="size-5" />
      </div>
      <span className="truncate text-sm pr-6">Unsupported file type</span>
      {removable && (
        <button
          type="button"
          className="absolute top-2 right-2 transition-all hover:opacity-80 cursor-pointer"
          onClick={onRemove}
          aria-label="Remove file"
        >
          <CancelCircleIcon className="size-5 text-foreground" />
        </button>
      )}
    </div>
  );
};
