"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Computer, Star as DefaultStar } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Agent } from "@/types/agent";
import {
  groupAgentsByGraphs,
  isDefaultAssistant,
  sortAgentGroup,
} from "@/lib/agent-utils";
import { getDeployments } from "@/lib/environment/deployments";

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
  setValue?: (value: string) => void;
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
  const [selectedAssistantId, selectedDeploymentId] = value.split(":");
  const selectedAgent = agents.find(
    (item) => item.assistant_id === selectedAssistantId && item.deploymentId === selectedDeploymentId,
  );

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
  const deployments = getDeployments();

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
            {deployments.map((deployment) => {
              // Filter agents for the current deployment
              const deploymentAgents = agents.filter(
                (agent) => agent.deploymentId === deployment.id,
              );
              // Group filtered agents by graph
              const agentsGroupedByGraphs = groupAgentsByGraphs(deploymentAgents);

              // Only render the deployment group if it has agents
              if (agentsGroupedByGraphs.length === 0) {
                return null;
              }

              return (
                <React.Fragment key={deployment.id}>
                <CommandGroup
                  heading={deployment.name} // Use deployment name as heading
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {/* Map over graphs within the deployment */}
                  {agentsGroupedByGraphs.map((agentGroup) => {
                    const sortedAgentGroup = sortAgentGroup(agentGroup);
                    return (
                      // Nested CommandGroup for the graph
                      <CommandGroup
                        key={`${deployment.id}-${agentGroup[0].graph_id}`}
                        heading={agentGroup[0].graph_id} // Use graph_id as heading
                        // Add some styling/indentation if desired for the nested group
                        className="ml-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-normal"
                      >
                        {/* Map over agents within the graph */}
                        {sortedAgentGroup.map((item) => (
                          <CommandItem
                            key={item.assistant_id}
                            value={`${item.assistant_id}:${item.deploymentId}`}
                            onSelect={(currentValue) => {
                              setValue?.(
                                currentValue === value ? "" : currentValue,
                              );
                              setOpen?.(false);
                            }}
                            className="flex w-full items-center justify-between"
                          >
                            <p className="line-clamp-1 flex-1 truncate pr-2">
                              {isDefaultAssistant(item)
                                ? "Default agent"
                                : item.name}
                            </p>
                            <div className="flex flex-shrink-0 items-center justify-end gap-2">
                              {isDefaultAssistant(item) && (
                                <DefaultStar className="opacity-100" />
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
                </CommandGroup>
                <CommandSeparator />
                </React.Fragment>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
