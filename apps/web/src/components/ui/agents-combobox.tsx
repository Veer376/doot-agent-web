"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

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

export interface AgentsComboboxProps {
  agents: Agent[][];
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

export function AgentsCombobox({
  agents,
  placeholder = "Select an agent...",
  open,
  setOpen,
  value,
  setValue,
  className,
}: AgentsComboboxProps) {
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
          {value
            ? agents
                .flat()
                .find(
                  (item) =>
                    `${item.assistant_id}:${item.deploymentId}` === value,
                )?.name
            : placeholder}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search agents..." />
          <CommandList>
            <CommandEmpty>No agents found.</CommandEmpty>
            {agents.map((agentGroup) => (
              <CommandGroup
                key={agentGroup[0].deploymentId}
                heading={agentGroup[0].deploymentId}
              >
                {agentGroup.map((item) => (
                  <CommandItem
                    key={item.assistant_id}
                    value={`${item.assistant_id}:${item.deploymentId}`}
                    onSelect={(currentValue) => {
                      setValue?.(currentValue === value ? "" : currentValue);
                      setOpen?.(false);
                    }}
                  >
                    {item.name}
                    <Check
                      className={cn(
                        "ml-auto",
                        value === `${item.assistant_id}:${item.deploymentId}`
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
