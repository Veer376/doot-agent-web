"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Star } from "lucide-react";

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
import { Agent } from "@/types/agent";
import { isDefaultAssistant, sortAgentGroup } from "@/lib/agent-utils";

export interface AgentsComboboxProps {
  agents: Agent[];
  /**
   * The placeholder text to display when no value is selected.
   * @default "Select an agent..."
   */
  placeholder?: string;
  open?: boolean;
  setOpen?: (v: boolean) => void;
  value?: string;
  setValue?: (v: string) => void;
  className?: string;
}

/**
 * Returns the selected agent's name or "Default agent" if the selected agent is the default assistant.
 * @param value The value of the selected agent.
 * @param agents The array of agents.
 * @returns The name of the selected agent or "Default agent".
 */
const getSelectedAgentValue = (
  value: string,
  agents: Agent[],
): React.ReactNode => {
  const selectedAgent = agents
    .flat()
    .find((item) => `${item.assistant_id}:${item.deploymentId}` === value);

  if (selectedAgent) {
    return isDefaultAssistant(selectedAgent)
      ? `Default agent - ${selectedAgent.graph_id}`
      : selectedAgent.name;
  }
  return "";
};

export function AgentsCombobox({
  agents,
  placeholder = "Select an agent...",
  open,
  setOpen,
  value,
  setValue,
  className,
}: AgentsComboboxProps) {
  const agentsGroupedByGraphs = Object.values(
    agents.reduce<Record<string, Agent[]>>((acc, agent) => {
      const groupId = agent.graph_id;
      if (!acc[groupId]) {
        acc[groupId] = [];
      }
      acc[groupId].push(agent);
      return acc;
    }, {}),
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger
        asChild
        className={className}
      >
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {value ? getSelectedAgentValue(value, agents) : placeholder}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search agents..." />
          <CommandList>
            <CommandEmpty>No agents found.</CommandEmpty>
            {agentsGroupedByGraphs.map((agentGroup) => {
              const sortedAgentGroup = sortAgentGroup(agentGroup);
              return (
                <CommandGroup
                  key={`${agentGroup[0].deploymentId}-${agentGroup[0].graph_id}`}
                  heading={agentGroup[0].graph_id}
                >
                  {sortedAgentGroup.map((item) => (
                    <CommandItem
                      key={item.assistant_id}
                      value={`${item.assistant_id}:${item.deploymentId}`}
                      onSelect={(currentValue) => {
                        setValue?.(currentValue === value ? "" : currentValue);
                        setOpen?.(false);
                      }}
                      className="w-full"
                    >
                      <p className="line-clamp-1 w-full truncate">
                        {isDefaultAssistant(item) ? "Default agent" : item.name}
                      </p>
                      <div className="flex items-center justify-end gap-2">
                        {isDefaultAssistant(item) && (
                          <Star className="opacity-100" />
                        )}
                        <Check
                          className={cn(
                            value ===
                              `${item.assistant_id}:${item.deploymentId}`
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
