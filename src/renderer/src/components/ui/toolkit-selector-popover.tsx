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
    async (server: MCPServerInstance) => {
      // Try to get tools from cache
      let tools = queryClient.getQueryData<MCPTool[]>(mcpKeys.tools(server.id));

      // If not in cache, fetch them (assuming server is connected/activated)
      if (!tools || tools.length === 0) {
        console.log(`[MCP] Tools missing for ${server.id}, fetching...`);
        try {
           // We use mcp:server:connect which ensures connection + return tools
           // This handles re-connecting if the process died or just fetching tools if connected
           const result = await invoke<{ server: MCPServerInstance; tools: MCPTool[] }>(
                "mcp:server:connect",
                server.id
            );
            tools = result.tools;
            // Update cache
            queryClient.setQueryData(mcpKeys.tools(server.id), tools);
        } catch (err) {
            console.error(`[MCP] Failed to fetch tools for ${server.id}:`, err);
            tools = [];
        }
      }

      const toolkit: SelectedToolkit = {
        id: server.id,
        name: server.name,
        toolCount: server.toolCount,
        tools: tools || [],
        isConnected: server.status === "CONNECTED",
      };
      
      console.log(`[MCP] Popover selecting toolkit:`, {
        id: toolkit.id,
        name: toolkit.name,
        toolsFound: toolkit.tools?.length,
        tools: toolkit.tools
      });
      onSelect(toolkit);
    },
    [onSelect, queryClient]
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

