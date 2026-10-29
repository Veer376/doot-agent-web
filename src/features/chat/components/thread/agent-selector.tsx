"use client";

import React, { useState, useCallback } from "react";
import { ArrowDown01Icon, ArrowUp01Icon } from "hugeicons-react";
import { getAgentIcon } from "@/lib/agent-icon-registry";
import { AgentsCombobox } from "@/components/ui/agents-combobox";
import { useFetchAgents } from "@/hooks/use-agents";
import { useStreamContext } from "@/features/chat/providers/Stream";
import { useAgentContext } from "@/providers/Agent";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthSession } from "@/providers/Auth";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { EditConfigurationDialog } from "@/features/chat/components/edit-configuration-dialog";
import { Agent } from "@/types/agent";

interface SimpleAgentSelectorProps {
  className?: string;
}

export function SimpleAgentSelector({ className }: SimpleAgentSelectorProps) {
  const { data: agents = [], isLoading: loading } = useFetchAgents();

  const [open, setOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { isAuthenticated } = useAuthSession();

  const { agentId, setSelectedAgent } = useAgentContext();
  const stream = useStreamContext();
  const isStreaming = stream.isLoading;
  const hasMessages = stream.messages.length > 0;

  const handleSelect = useCallback(
    (value: string | string[]) => {
      const selectedId = Array.isArray(value) ? value[0] : value;
      if (!selectedId) return;

      if (isStreaming) {
        toast.info("Please wait for the current response to complete");
        return;
      }

      if (hasMessages && agentId !== selectedId) {
        toast.info("Switching agents mid-conversation", {
          description: "New agent will have previous agent context.",
          duration: 3000,
        });
      }

      setSelectedAgent(selectedId);
    },
    [agentId, hasMessages, isStreaming, setSelectedAgent],
  );

  const handleEdit = useCallback(
    (agent: Agent) => {
      setSelectedAgent(agent.assistant_id);
      setOpen(false);
      // Defer dialog open one tick so the Popover portal is fully unmounted first
      setTimeout(() => setEditDialogOpen(true), 0);
    },
    [setSelectedAgent],
  );

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !isAuthenticated) {
      setAuthDialogOpen(true);
      return;
    }
    setOpen(newOpen);
  };

  const selectedAgent = agents.find((a) => a.assistant_id === agentId);
  const AgentIcon = selectedAgent
    ? getAgentIcon(selectedAgent.metadata?.icon as string)
    : null;

  return (
    <>
      <AgentsCombobox
        agents={agents}
        agentsLoading={loading}
        open={open}
        setOpen={handleOpenChange}
        value={agentId || ""}
        setValue={handleSelect}
        onEditAgent={handleEdit}
        triggerAsChild
        trigger={
          <button
            type="button"
            role="combobox"
            aria-label="Select agent"
            aria-expanded={open}
            className={cn(
              "doot-agent-control flex min-w-0 items-center gap-1.5 transition-colors",
              "hover:bg-accent",
              "focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
              className,
            )}
          >
            {AgentIcon && <AgentIcon className="size-4 shrink-0" />}
            <span className="doot-agent-name text-foreground max-w-33 truncate text-sm font-medium">
              {selectedAgent?.name ?? "Agent"}
            </span>
            {open ? (
              <ArrowUp01Icon className="text-muted-foreground size-3.5 shrink-0" />
            ) : (
              <ArrowDown01Icon className="text-muted-foreground size-3.5 shrink-0" />
            )}
          </button>
        }
      />

      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
      />

      <EditConfigurationDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </>
  );
}
