"use client";

import * as React from "react";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  StarIcon,
  LoaderIcon,
  EditIcon,
} from "@/components/icons";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Agent } from "@/types/agent";
import { isPrimaryAgent, sortAgentGroup } from "@/lib/agent-utils";

export interface AgentsComboboxProps {
  agents: Agent[];
  agentsLoading: boolean;
  /**
   * The placeholder text to display when no value is selected.
   * @default "Select an agent..."
   */
  placeholder?: string;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  /**
   * Single agent value (string) or multiple agent values (string[])
   */
  value?: string | string[];
  /**
   * Callback for setting the value. Accepts a string for single selection or string[] for multiple selection.
   */
  setValue?: (value: string | string[]) => void;
  /**
   * Enable multiple selection mode
   * @default false
   */
  multiple?: boolean;
  /**
   * Prevent deselection of selected values
   * @default false
   */
  disableDeselect?: boolean;
  className?: string;
  style?: React.CSSProperties;
  trigger?: React.ReactNode;
  triggerAsChild?: boolean;
  footer?: React.ReactNode;
  /**
   * Callback when the edit button is clicked for an agent
   * If not provided, edit button won't be shown
   */
  onEditAgent?: (agent: Agent) => void;
}

/**
 * Returns the selected agent's name
 * @param value The value of the selected agent.
 * @param agents The array of agents.
 * @returns The name of the selected agent.
 */
const getSelectedAgentValue = (
  selectedAssistantId: string,
  agents: Agent[],
): React.ReactNode => {
  const selectedAgent = agents.find(
    (item) => item.assistant_id === selectedAssistantId,
  );

  if (selectedAgent) {
    return (
      <span className="flex w-full items-center gap-2">
        {selectedAgent.name}
      </span>
    );
  }
  return "";
};

/**
 * Returns a formatted display string for multiple selected agents
 * @param values Array of selected agent values
 * @param agents The array of agents
 * @returns Formatted string for display
 */
const getMultipleSelectedAgentValues = (
  values: string[],
  agents: Agent[],
): React.ReactNode => {
  if (values.length === 0) return "";
  if (values.length === 1) return getSelectedAgentValue(values[0], agents);
  return `${values.length} agents selected`;
};

const getNameFromValue = (value: string, agents: Agent[]) => {
  const selectedAgent = agents.find((item) => item.assistant_id === value);
  return selectedAgent?.name || "";
};

export function AgentsCombobox({
  agents,
  placeholder = "Select an agent...",
  open,
  setOpen,
  value,
  setValue,
  multiple = false,
  disableDeselect = false,
  className,
  trigger,
  triggerAsChild,
  footer,
  style,
  agentsLoading,
  onEditAgent,
}: AgentsComboboxProps) {
  // Convert value to array for internal handling
  const selectedValues = React.useMemo(() => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }, [value]);

  // Handle selection of an item
  const handleSelect = (currentValue: string) => {
    if (!setValue) return;

    if (multiple) {
      // For multiple selection mode
      const newValues = [...selectedValues];
      const index = newValues.indexOf(currentValue);

      if (index === -1) {
        // Add the value if not already selected
        newValues.push(currentValue);
      } else if (!disableDeselect) {
        // Remove the value if already selected (only if deselection is allowed)
        newValues.splice(index, 1);
      }

      setValue(newValues);
    } else {
      // For single selection mode (backward compatibility)
      const shouldDeselect =
        currentValue === selectedValues[0] && !disableDeselect;
      setValue(shouldDeselect ? "" : currentValue);
      setOpen?.(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild={triggerAsChild || !trigger}>
        {trigger || (
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("min-w-[200px] justify-between", className)}
            style={style}
          >
            {selectedValues.length > 0
              ? multiple
                ? getMultipleSelectedAgentValues(selectedValues, agents)
                : getSelectedAgentValue(selectedValues[0], agents)
              : placeholder}
            <ChevronsUpDownIcon className="opacity-50" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-full min-w-[200px] p-0"
      >
        <Command
          filter={(value: string, search: string) => {
            const name = getNameFromValue(value, agents);
            if (!name) return 0;
            if (name.toLowerCase().includes(search.toLowerCase())) {
              return 1;
            }
            return 0;
          }}
        >
          <CommandInput placeholder="Search agents..." />
          <CommandList>
            <CommandEmpty>
              {agentsLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoaderIcon className="size-4" />
                  Loading agents...
                </span>
              ) : (
                "No agents found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {sortAgentGroup(agents).map((item) => {
                const itemValue = item.assistant_id;
                const isSelected = selectedValues.includes(itemValue);
                const isPrimary = isPrimaryAgent(item);

                return (
                  <TooltipProvider
                    key={itemValue}
                    delayDuration={300}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="group/agent-item relative">
                          {onEditAgent && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onEditAgent(item);
                              }}
                              className={cn(
                                "peer/edit-btn absolute top-1/2 right-2 z-10 -translate-y-1/2",
                                "text-muted-foreground rounded-sm p-1.5 transition-colors",
                                "opacity-0 group-hover/agent-item:opacity-100",
                                "hover:bg-accent hover:text-foreground",
                                "focus-visible:ring-ring focus:outline-none focus-visible:ring-2",
                              )}
                              aria-label={`Edit ${item.name}`}
                            >
                              <EditIcon size="xs" />
                            </button>
                          )}
                          <CommandItem
                            value={itemValue}
                            onSelect={handleSelect}
                            className={cn(
                              "flex w-full items-center gap-2 pr-12",
                              "peer-hover/edit-btn:data-[selected=true]:text-foreground peer-hover/edit-btn:data-[selected=true]:bg-transparent",
                            )}
                          >
                            <CheckIcon
                              className={cn(
                                "flex-shrink-0",
                                isSelected ? "opacity-100" : "opacity-0",
                              )}
                            />

                            <p className="line-clamp-1 min-w-0 flex-1 truncate">
                              {item.name}
                            </p>
                            {isPrimary && (
                              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                                <StarIcon size="xs" />
                                <span className="hidden sm:inline">
                                  Primary
                                </span>
                              </span>
                            )}
                          </CommandItem>
                        </div>
                      </TooltipTrigger>
                      {item.description && (
                        <TooltipContent
                          side="right"
                          align="start"
                          className="max-w-[250px]"
                        >
                          <p className="text-sm">{item.description}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </CommandGroup>

            {footer}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
