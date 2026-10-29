/**
 * Model Selector Popover
 *
 * Displays the selected agent's available models in a searchable menu.
 * Models can come from multiple backend catalogs and are grouped by source.
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
  PopoverTrigger,
} from "@/components/ui/popover";
import { CheckIcon } from "@/components/icons";
import { ModelProviderIcon } from "@/components/ui/model-provider-icon";
import { cn } from "@/lib/utils";
import type { Model } from "@/types/model";

interface ModelSelectorPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSelect: (model: Model) => void;
  models: Model[];
  trigger: React.ReactNode;
  selectedModelId?: string | null;
  autoFocusSearch?: boolean;
}

export function ModelSelectorPopover({
  open,
  onOpenChange,
  searchQuery,
  onSelect,
  models,
  trigger,
  selectedModelId,
  autoFocusSearch = true,
}: ModelSelectorPopoverProps) {
  const [activeModelId, setActiveModelId] = useState(selectedModelId ?? "");
  const [inputQuery, setInputQuery] = useState(searchQuery);
  useEffect(() => setInputQuery(searchQuery), [searchQuery, open]);

  const allModels = useMemo(
    () =>
      [...models].sort((a, b) => {
        const aLocal = a.source === "local";
        const bLocal = b.source === "local";
        if (aLocal === bLocal) return 0;
        return aLocal ? -1 : 1;
      }),
    [models],
  );

  const filteredModels = useMemo(() => {
    if (!inputQuery) return allModels;
    const query = inputQuery.toLowerCase().trim();
    const rank = (model: Model) => {
      const id = model.id.toLowerCase();
      const unprefixedId = id.replace(/^(local|cloud)-/, "");
      const name = model.name.toLowerCase();
      const provider = model.provider.toLowerCase();
      if (name === query || id === query || unprefixedId === query) return 0;
      if (
        name.startsWith(query) ||
        id.startsWith(query) ||
        unprefixedId.startsWith(query)
      )
        return 1;
      if (provider.startsWith(query)) return 2;
      return 3;
    };
    return allModels
      .filter(
        (model) =>
          model.id.toLowerCase().includes(query) ||
          model.name.toLowerCase().includes(query) ||
          model.provider.toLowerCase().includes(query),
      )
      .sort((a, b) => rank(a) - rank(b));
  }, [inputQuery, allModels]);

  const isSearching = Boolean(inputQuery.trim());
  const selectedModel = useMemo(
    () =>
      !isSearching
        ? filteredModels.find((model) => model.id === selectedModelId) ?? null
        : null,
    [filteredModels, selectedModelId, isSearching],
  );
  const remainingModels = useMemo(
    () =>
      selectedModel
        ? filteredModels.filter((model) => model.id !== selectedModelId)
        : filteredModels,
    [filteredModels, selectedModelId, selectedModel],
  );
  const localFiltered = useMemo(
    () => remainingModels.filter((model) => model.source === "local"),
    [remainingModels],
  );
  const cloudFiltered = useMemo(
    () => remainingModels.filter((model) => model.source !== "local"),
    [remainingModels],
  );

  const handleModelSelect = useCallback(
    (model: Model) => {
      onSelect(model);
      onOpenChange(false);
    },
    [onSelect, onOpenChange],
  );

  // Search always highlights the strongest match. With an empty query, keep
  // the currently selected model active because it is rendered first.
  useEffect(() => {
    const bestMatch = isSearching
      ? filteredModels[0]
      : selectedModel ?? filteredModels[0];
    setActiveModelId(bestMatch?.id ?? "");
  }, [filteredModels, isSearching, selectedModel]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest("[cmdk-root]"))
        return;
      const currentIndex = Math.max(
        0,
        filteredModels.findIndex((model) => model.id === activeModelId),
      );
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveModelId(
            filteredModels[Math.min(currentIndex + 1, filteredModels.length - 1)]
              ?.id ?? "",
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveModelId(filteredModels[Math.max(currentIndex - 1, 0)]?.id ?? "");
          break;
        case "Enter":
          e.preventDefault();
          const activeModel =
            filteredModels.find((model) => model.id === activeModelId) ??
            filteredModels[0];
          if (activeModel) handleModelSelect(activeModel);
          break;
        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filteredModels, activeModelId, onOpenChange, handleModelSelect]);

  const renderModel = (model: Model) => {
    const isSelected = selectedModelId === model.id;
    return (
      <CommandItem
        key={model.id}
        value={model.id}
        onMouseEnter={() => setActiveModelId(model.id)}
        onSelect={() => handleModelSelect(model)}
        className="flex w-full cursor-pointer items-center gap-2 hover:bg-accent hover:text-accent-foreground"
        data-radius="control"
      >
        <ModelProviderIcon provider={model.provider} />
        <p className="line-clamp-1 min-w-0 flex-1 truncate">{model.name}</p>
        {model.source === "local" && (
          <span className="bg-muted text-muted-foreground text-doot-fine shrink-0 rounded-full px-1.5 py-0.5 font-medium leading-none">
            Local
          </span>
        )}
        <CheckIcon
          size="xs"
          className={cn(
            "ml-auto shrink-0 transition-opacity",
            isSelected ? "opacity-100" : "opacity-0",
          )}
        />
      </CommandItem>
    );
  };

  return (
    <>
      <Popover
        open={open}
        onOpenChange={onOpenChange}
      >
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          className="w-80 max-w-[calc(100vw-1.5rem)] p-0"
          side="top"
          align="end"
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={(e) => {
            if (!autoFocusSearch) e.preventDefault();
          }}
        >
          <Command
            shouldFilter={false}
            value={activeModelId}
            onValueChange={setActiveModelId}
          >
            <div className="relative">
              <CommandInput
                placeholder="Search models..."
                value={inputQuery}
                onValueChange={setInputQuery}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                  const activeModel =
                    filteredModels.find((model) => model.id === activeModelId) ??
                    filteredModels[0];
                  if (!activeModel) return;
                  event.preventDefault();
                  handleModelSelect(activeModel);
                }}
              />
            </div>
            <CommandList>
              <CommandEmpty>No models found</CommandEmpty>

              {selectedModel && (
                <CommandGroup heading="Selected">
                  {renderModel(selectedModel)}
                </CommandGroup>
              )}

              {isSearching && remainingModels.length > 0 && (
                <CommandGroup heading="Results">
                  {remainingModels.map(renderModel)}
                </CommandGroup>
              )}

              {!isSearching && localFiltered.length > 0 && (
                <CommandGroup heading="Local">
                  {localFiltered.map(renderModel)}
                </CommandGroup>
              )}

              {/* Cloud Models Group */}
              {!isSearching && cloudFiltered.length > 0 && (
                <CommandGroup heading="Cloud">
                  {cloudFiltered.map(renderModel)}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
