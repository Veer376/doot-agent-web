/**
 * Model Selector Popover
 *
 * Displays available models in a searchable command menu.
 * Merges cloud models (from YAML / hardcoded) with Ollama local models.
 * Shows lazy-loading indicator while Ollama models are being fetched.
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
import { CheckIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { AVAILABLE_MODELS, type Model } from "@/types/model";

// ============================================================================
// Provider Icons
// ============================================================================

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
          fill="#000000"
        >
          <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z" />
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
    case "ollama":
      return (
        <span
          className={cn(
            "flex h-4 w-4 items-center justify-center text-sm leading-none",
            className,
          )}
        >
          🦙
        </span>
      );
    default:
      return (
        <svg
          viewBox="0 0 24 24"
          className={cn("h-4 w-4", className)}
          fill="currentColor"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      );
  }
};

// ============================================================================
// Component
// ============================================================================

interface ModelSelectorPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSelect: (model: Model) => void;
  selectedModelId?: string | null;
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

  // ── Available models ──
  const cloudModels: Model[] = AVAILABLE_MODELS;

  const allModels = useMemo(() => [...cloudModels], [cloudModels]);

  const filteredModels = useMemo(() => {
    if (!searchQuery) return allModels;
    const query = searchQuery.toLowerCase().trim();
    return allModels
      .filter(
        (model) =>
          model.id.toLowerCase().includes(query) ||
          model.name.toLowerCase().includes(query) ||
          model.provider.toLowerCase().includes(query),
      )
      .sort((a, b) => {
        const aStarts = a.id.toLowerCase().startsWith(query);
        const bStarts = b.id.toLowerCase().startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });
  }, [searchQuery, allModels]);

  // Split into groups (no Ollama in web — cloudFiltered is all models)
  const cloudFiltered = useMemo(() => filteredModels, [filteredModels]);
  // const ollamaFiltered = useMemo(
  //   () => filteredModels.filter((m) => m.provider === "ollama"),
  //   [filteredModels],
  // );

  // Auto-select best match on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredModels]);

  // Keyboard navigation
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
            handleModelSelect(filteredModels[selectedIndex]);
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
  }, [open, filteredModels, selectedIndex, onOpenChange]);

  const handleModelSelect = useCallback(
    (model: Model) => {
      onSelect(model);
    },
    [onSelect],
  );

  return (
    <>
      <Popover
        open={open}
        onOpenChange={onOpenChange}
      >
        {anchorEl && <PopoverAnchor virtualRef={{ current: anchorEl }} />}
        <PopoverContent
          className="w-full min-w-[280px] p-0"
          side="top"
          align="start"
          sideOffset={8}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
          }}
        >
          <Command shouldFilter={false}>
            <div className="relative">
              <CommandInput
                placeholder="Search models..."
                value={searchQuery}
                readOnly
                className="pointer-events-none"
              />
            </div>
            <CommandList>
              <CommandEmpty>No models found</CommandEmpty>

              {/* Cloud Models Group */}
              {cloudFiltered.length > 0 && (
                <CommandGroup heading="☁ Cloud">
                  {cloudFiltered.map((model, index) => {
                    const globalIndex = filteredModels.indexOf(model);
                    const isSelected = selectedModelId === model.id;
                    const isHighlighted = globalIndex === selectedIndex;

                    return (
                      <CommandItem
                        key={model.id}
                        value={model.id}
                        onSelect={() => handleModelSelect(model)}
                        className={cn(
                          "group/model-item flex w-full items-center gap-2",
                          isHighlighted && "bg-accent",
                        )}
                        data-radius="small-radius"
                      >
                        <div className="relative flex-shrink-0">
                          <CheckIcon
                            size="xs"
                            className={cn(
                              isSelected
                                ? "block group-hover/model-item:hidden"
                                : "hidden",
                            )}
                          />
                          <div
                            className={cn(
                              !isSelected
                                ? "block"
                                : "hidden group-hover/model-item:block",
                            )}
                          >
                            <ProviderIcon provider={model.provider} />
                          </div>
                        </div>
                        <p className="line-clamp-1 min-w-0 flex-1 truncate">
                          {model.name}
                        </p>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
