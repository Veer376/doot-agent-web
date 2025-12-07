/**
 * Model Selector Popover
 * 
 * Displays available models in a searchable command menu
 * Consistent design with agents-combobox
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { CheckIcon, LoaderIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { AVAILABLE_MODELS, type Model } from "@/types/model";

interface ModelSelectorPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSelect: (model: Model) => void;
  selectedModelId?: string | null;
  /**
   * Anchor element for positioning (usually the textarea)
   */
  anchorEl?: HTMLElement | null;
}

export function ModelSelectorPopover({
  open,
  onOpenChange,
  searchQuery,
  onSelect,
  selectedModelId,
  anchorEl,
}: ModelSelectorPopoverProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    if (!searchQuery) return AVAILABLE_MODELS;

    const query = searchQuery.toLowerCase().trim();
    return AVAILABLE_MODELS.filter(
      (model) =>
        model.id.toLowerCase().includes(query) ||
        model.name.toLowerCase().includes(query) ||
        model.provider.toLowerCase().includes(query)
    ).sort((a, b) => {
      // Prioritize exact prefix matches
      const aStarts = a.id.toLowerCase().startsWith(query);
      const bStarts = b.id.toLowerCase().startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });
  }, [searchQuery]);

  // Auto-select best match on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredModels]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredModels.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredModels[selectedIndex]) {
            onSelect(filteredModels[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filteredModels, selectedIndex, onSelect, onOpenChange]);

  const handleSelect = useCallback(
    (model: Model) => {
      onSelect(model);
    },
    [onSelect]
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {anchorEl && <PopoverAnchor virtualRef={{ current: anchorEl }} />}
      <PopoverContent
        className="w-96 p-0"
        side="top"
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => {
          // Prevent focus stealing from textarea
          e.preventDefault();
        }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search models..."
            value={searchQuery}
            readOnly
            className="pointer-events-none"
          />
          <CommandList>
            <CommandEmpty>
              {filteredModels.length === 0 ? (
                "No models found"
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LoaderIcon className="size-4" />
                  Loading models...
                </span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredModels.map((model, index) => {
                const isSelected = selectedModelId === model.id;
                const isHighlighted = index === selectedIndex;

                return (
                  <CommandItem
                    key={model.id}
                    value={model.id}
                    onSelect={() => handleSelect(model)}
                    className={cn(
                      "flex items-start gap-3 px-3 py-2",
                      isHighlighted && "bg-accent"
                    )}
                  >
                    {/* Checkmark indicator */}
                    <CheckIcon
                      size="xs"
                      className={cn(
                        "mt-1 flex-shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />

                    {/* Model info */}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {model.name}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {model.provider}
                        </span>
                      </div>
                      {model.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {model.description}
                        </span>
                      )}
                      {model.contextWindow && (
                        <span className="text-xs text-muted-foreground">
                          {(model.contextWindow / 1000).toFixed(0)}K context
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
