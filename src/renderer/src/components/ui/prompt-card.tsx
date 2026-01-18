import React from "react";
import { cn } from "@/lib/utils";

export interface PromptTemplate {
  id: string;
  title: string;
  prompt: string;
  imageUrl: string;
}

interface PromptCardProps {
  template: PromptTemplate;
  onClick?: () => void;
}

export function PromptCard({ template, onClick }: PromptCardProps) {
  return (
    <div
      onClick={onClick}
      data-radius="radius2"
      className={cn(
        "bg-card border-border hover:border-primary/30 group flex h-24 w-56 cursor-pointer flex-shrink-0 overflow-hidden border transition-all duration-300",
        "hover:shadow-md"
      )}
    >
      {/* Left: Title and Prompt */}
      <div className="flex flex-1 flex-col justify-center gap-1.5 p-3">
        <h3 className="text-foreground line-clamp-1 text-xs font-semibold">
          {template.title}
        </h3>
        <p className="text-muted-foreground line-clamp-2 text-[10px] leading-relaxed">
          {template.prompt}
        </p>
      </div>

      {/* Right: Circular Image */}
      <div className="relative flex h-full w-24 flex-shrink-0 items-center justify-center p-3">
        <div className="relative h-16 w-16 overflow-hidden rounded-full">
          <img
            src={template.imageUrl}
            alt={template.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </div>
    </div>
  );
}
