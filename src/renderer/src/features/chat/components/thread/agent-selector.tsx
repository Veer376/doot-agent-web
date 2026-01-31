"use client";

import React, { useState, useCallback, useMemo } from "react";
import { ArrowDown01Icon, ArrowUp01Icon } from "hugeicons-react";
import { getAgentIcon } from "@/lib/agent-icon-registry";
import { AgentsCombobox } from "@/components/ui/agents-combobox";
import { useFetchCloudAgents } from "@/hooks/use-cloud-agents";
import { useLocalAgents } from "@/hooks/use-local-agents";
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
  const { data: cloudAgents = [], isLoading: loadingCloud } = useFetchCloudAgents();
  const { data: localAgents = [], isLoading: loadingLocal } = useLocalAgents();

  // Combine cloud and local agents
  // Cloud agents get 'cloud' source if not already set
  // Local agents already have 'local' source from transformLocalAgentToAgent
  const agents = useMemo(() => {
    const cloudAgentsWithSource = cloudAgents.map((agent) => ({
      ...agent,
      metadata: {
        ...agent.metadata,
        source: agent.metadata?.source || ("cloud" as const),
      },
    }));
    // Local agents already have proper metadata.source = 'local'
    return [...cloudAgentsWithSource, ...localAgents];
  }, [cloudAgents, localAgents]);

  const loading = loadingCloud || loadingLocal;

  const [open, setOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isHovered, setIsHovered] = useState(false);
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

  const handleEdit = useCallback((agent: Agent) => {
    setEditingAgent(agent);
    setEditDialogOpen(true);
    setOpen(false);
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !isAuthenticated) {
      setAuthDialogOpen(true);
      return;
    }
    setOpen(newOpen);
  };

  const selectedAgent = agents.find((a) => a.assistant_id === agentId);
  const AgentIcon = selectedAgent
    ? getAgentIcon(selectedAgent.assistant_id)
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
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors",
              "hover:bg-accent/60 dark:hover:bg-accent/40",
              "focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-2",
              className,
            )}
          >
            <div className="relative flex size-5 items-center justify-center">
              {open ? (
                <ArrowUp01Icon className="size-4 text-muted-foreground" />
              ) : isHovered ? (
                <ArrowDown01Icon className="size-4 text-muted-foreground" />
              ) : AgentIcon ? (
                <AgentIcon className="size-5" />
              ) : null}
            </div>
            <span className="max-w-[140px] truncate text-sm font-medium text-foreground">
              {selectedAgent?.name || "Agent"}
            </span>
          </button>
        }
      />

      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
      />

      {editingAgent && (
        <EditConfigurationDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
    </>
  );
}
