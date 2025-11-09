import React from "react";
import { MultimodalPreview } from "./MultimodalPreview";
import { cn } from "@/lib/utils";

// Type for content blocks - defining locally to avoid import issues  
interface Base64ContentBlock {
  type: "image" | "file";
  source_type: "base64";
  mime_type: string;
  data: string;
  metadata?: {
    name?: string;
    filename?: string;
  };
}

interface ContentBlocksPreviewProps {
  blocks: Base64ContentBlock[];
  onRemove: (idx: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Renders a preview of content blocks with optional remove functionality.
 * Uses cn utility for robust class merging.
 */
export const ContentBlocksPreview: React.FC<ContentBlocksPreviewProps> = ({
  blocks,
  onRemove,
  size = "md",
  className,
}) => {
  if (!blocks.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {blocks.map((block, idx) => (
        <MultimodalPreview
          key={idx}
          block={block}
          removable
          onRemove={() => onRemove(idx)}
          size={size}
        />
      ))}
    </div>
  );
};
