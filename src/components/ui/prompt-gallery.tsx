"use client";

import React, { useRef } from "react";
import { PromptCard, type PromptTemplate } from "./prompt-card";
import { cn } from "@/lib/utils";

interface PromptGalleryProps {
  templates: PromptTemplate[];
  onPromptClick?: (template: PromptTemplate) => void;
  className?: string;
}

export function PromptGallery({
  templates,
  onPromptClick,
  className,
}: PromptGalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className={cn("relative w-full", className)}>
      {/* Left fade gradient */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-background to-transparent" />

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-4 overflow-x-auto px-6 py-2"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {templates.map((template) => (
          <PromptCard
            key={template.id}
            template={template}
            onClick={() => onPromptClick?.(template)}
          />
        ))}
      </div>

      {/* Right fade gradient */}
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
