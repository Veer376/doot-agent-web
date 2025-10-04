"use client";

import React, { useState, useCallback, useEffect } from "react";
import { AgentIcon } from "@/components/icons";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { AgentsCombobox } from "@/components/ui/agents-combobox";
import { useAgentsContext } from "@/providers/Agents";
import { useAgentContext } from "@/features/chat/providers/Stream";
import { useQueryState } from "nuqs";
import { useThreadAgent } from "@/hooks/use-thread-agent";
import { isUserSpecifiedDefaultAgent } from "@/lib/agent-utils";
import { cn } from "@/lib/utils";

interface IconAgentSelectorProps {
  className?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

export function IconAgentSelector({
  className,
  onOpenChange,
}: IconAgentSelectorProps) {
  const { agents, loading } = useAgentsContext();
  const [open, setOpen] = useState(false);

  // PHASE 3: Get agentId from context instead of URL
  const { agentId, setAgentId } = useAgentContext();
  const [threadId] = useQueryState("threadId");

  // Phase 2: Thread-Agent Persistence
  const { saveThreadAgent } = useThreadAgent();

  const onAgentChange = useCallback(
    (v: string | string[] | undefined) => {
      const nextValue = Array.isArray(v) ? v[0] : v;
      if (!nextValue) return;

      // Value is just the assistant_id now (no deploymentId)
      setAgentId(nextValue);
      // NOTE: Agent change does NOT create new thread - agent is a property of the thread

      // Phase 2: Save thread-agent mapping when agent changes
      // Only save if we have an active thread (not on initial selection)
      if (threadId) {
        saveThreadAgent(threadId, nextValue);
      }
    },
    [setAgentId, threadId, saveThreadAgent],
  );

  const agentValue = agentId || undefined;

  useEffect(() => {
    if (agentValue || !agents.length) {
      return;
    }
    const defaultAgent = agents.find(isUserSpecifiedDefaultAgent);
    if (defaultAgent) {
      onAgentChange(defaultAgent.assistant_id);
    }
  }, [agents, agentValue, onAgentChange]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    onOpenChange?.(isOpen);
  };

  // Get selected agent for display
  const selectedAgent = agents.find(
    (agent) => agent.assistant_id === agentValue,
  );

  return (
    <AgentsCombobox
      agents={agents}
      agentsLoading={loading}
      value={agentValue}
      setValue={onAgentChange}
      open={open}
      setOpen={handleOpenChange}
      triggerAsChild
      className="min-w-auto"
      trigger={
        <TooltipIconButton
          tooltip={
            selectedAgent ? `Agent: ${selectedAgent.name}` : "Select Agent"
          }
          variant="ghost"
          className={cn(
            "flex-shrink-0 bg-blue-100 transition-colors ease-in-out hover:bg-blue-100",
            className,
          )}
        >
          <AgentIcon />
        </TooltipIconButton>
      }
    />
  );
}
