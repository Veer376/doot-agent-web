/**
 * Toolkit Selector Popover
 *
 * Displays activated MCP servers (toolkits) in a searchable command menu
 * Similar design to ModelSelectorPopover but with multiple selection
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
import { useMCPRegistry, mcpKeys } from "@/hooks/use-local-mcp";
import type { MCPServerInstance, MCPTool } from "@/types/mcp";
import { useQueryClient } from "@tanstack/react-query";
import { invoke } from "@/lib/electron";
import type { SelectedToolkit } from "@/types/mcp-toolkit";
import { ElectricPlugsIcon } from "hugeicons-react";

interface ToolkitSelectorPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSelect: (toolkit: SelectedToolkit) => void;
  /** Callback to update a toolkit after async tool loading completes */
  onUpdateToolkit?: (toolkitId: string, updates: Partial<SelectedToolkit>) => void;
  selectedToolkitIds: string[];
  /**
   * Anchor element for positioning (usually the textarea)
   */
  anchorEl?: HTMLElement | null;
}

export function ToolkitSelectorPopover({
  open,
  onOpenChange,
  searchQuery,
  onSelect,
  onUpdateToolkit,
  selectedToolkitIds,
  anchorEl,
}: ToolkitSelectorPopoverProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data: registryData, isLoading } = useMCPRegistry();
  const queryClient = useQueryClient();

  // Get only activated servers
  const activatedServers = useMemo(() => {
    if (!registryData?.servers) return [];
    return registryData.servers.filter(
      (s: MCPServerInstance) => s.status === "ACTIVATED" || s.status === "CONNECTED"
    );
  }, [registryData]);

  // Filter servers based on search query
  const filteredServers = useMemo(() => {
    if (!searchQuery) return activatedServers;

    const query = searchQuery.toLowerCase().trim();
    return activatedServers
      .filter(
        (server: MCPServerInstance) =>
          server.id.toLowerCase().includes(query) ||
          server.name.toLowerCase().includes(query) ||
          server.description?.toLowerCase().includes(query)
      )
      .sort((a: MCPServerInstance, b: MCPServerInstance) => {
        // Prioritize exact prefix matches
        const aStarts = a.name.toLowerCase().startsWith(query);
        const bStarts = b.name.toLowerCase().startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });
  }, [searchQuery, activatedServers]);

  // Auto-select first on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredServers]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredServers.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredServers[selectedIndex]) {
            handleSelect(filteredServers[selectedIndex]);
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
  }, [open, filteredServers, selectedIndex, onOpenChange]);

  const handleSelect = useCallback(
    (server: MCPServerInstance) => {
      // Try to get tools from cache
      const cachedTools = queryClient.getQueryData<MCPTool[]>(mcpKeys.tools(server.id));

      // If tools are cached, use them immediately (no loading state needed)
      if (cachedTools && cachedTools.length > 0) {
        const toolkit: SelectedToolkit = {
          id: server.id,
          name: server.name,
          toolCount: server.toolCount,
          tools: cachedTools,
          isConnected: server.status === "CONNECTED",
          isLoading: false,
        };
        console.log(`[MCP] Popover selecting toolkit (cached):`, {
          id: toolkit.id,
          name: toolkit.name,
          toolsFound: toolkit.tools?.length,
        });
        onSelect(toolkit);
        return;
      }

      // Tools not cached - select IMMEDIATELY with loading state (non-blocking)
      console.log(`[MCP] Toolkit ${server.id} - selecting with loading state, fetching tools in background...`);
      
      const loadingToolkit: SelectedToolkit = {
        id: server.id,
        name: server.name,
        toolCount: server.toolCount,
        tools: [],
        isConnected: false,
        isLoading: true,
      };
      onSelect(loadingToolkit);

      // Fetch tools in background (async, doesn't block UI)
      invoke<{ server: MCPServerInstance; tools: MCPTool[] }>(
        "mcp:server:connect",
        server.id
      )
        .then((result) => {
          const tools = result.tools || [];
          console.log(`[MCP] Toolkit ${server.id} - tools loaded:`, tools.length);
          
          // Update cache
          queryClient.setQueryData(mcpKeys.tools(server.id), tools);
          
          // Update the toolkit with actual tools via callback
          if (onUpdateToolkit) {
            onUpdateToolkit(server.id, {
              tools,
              toolCount: tools.length,
              isConnected: true,
              isLoading: false,
            });
          }
        })
        .catch((err) => {
          console.error(`[MCP] Failed to fetch tools for ${server.id}:`, err);
          // Still update to remove loading state
          if (onUpdateToolkit) {
            onUpdateToolkit(server.id, {
              tools: [],
              isConnected: false,
              isLoading: false,
            });
          }
        });
    },
    [onSelect, onUpdateToolkit, queryClient]
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {anchorEl && <PopoverAnchor virtualRef={{ current: anchorEl }} />}
      <PopoverContent
        className="w-full min-w-[250px] p-0"
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
            placeholder="Search toolkits..."
            value={searchQuery}
            readOnly
            className="pointer-events-none"
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoaderIcon className="size-4" />
                  Loading toolkits...
                </span>
              ) : activatedServers.length === 0 ? (
                <span className="text-muted-foreground">
                  No activated toolkits. Enable servers in MCP settings.
                </span>
              ) : (
                "No toolkits match your search"
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredServers.map((server: MCPServerInstance, index: number) => {
                const isSelected = selectedToolkitIds.includes(server.id);
                const isHighlighted = index === selectedIndex;

                return (
                  <CommandItem
                    key={server.id}
                    value={server.id}
                    onSelect={() => handleSelect(server)}
                    className={cn(
                      "group/toolkit-item flex w-full items-center gap-2",
                      isHighlighted && "bg-accent"
                    )}
                    data-radius="radius1"
                  >
                    {/* Left: Checkmark when selected, else plug icon */}
                    <div className="relative flex-shrink-0">
                      {isSelected ? (
                        <CheckIcon size="xs" />
                      ) : (
                        <ElectricPlugsIcon className="size-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Center: Toolkit Name */}
                    <div className="flex flex-1 flex-col min-w-0">
                      <p className="line-clamp-1 truncate font-medium">
                        {server.name}
                      </p>
                      {server.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {server.description}
                        </p>
                      )}
                    </div>

                    {/* Right: Toolkit badge */}
                    <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                      Toolkit
                    </span>
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

