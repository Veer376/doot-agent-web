"use client";

import { useState } from "react";
import { PlusIcon, SearchIcon, AgentIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateAgentDialog } from "../create-edit-agent-dialogs/create-agent-dialog";
import { Agent } from "@/types/agent";
import { isPrimaryAgent } from "@/lib/agent-utils";
import _ from "lodash";
import { AgentCard } from "../agent-card";
import { EmptyState } from "@/components/ui/empty-state";

interface AgentListProps {
  agents: Agent[];
}

export function AgentList({ agents }: AgentListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const primaryAgent = agents.find(isPrimaryAgent) ?? agents[0];
  const graphId = primaryAgent.graph_id;
  // Agent ID in this context is the primary assistant ID since it's used
  // to fetch the config schema for a specific graph
  const agentId = primaryAgent.assistant_id;

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreateDialog(true)}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          New Agent
        </Button>
      </div>

      {filteredAgents.length === 0 ? (
        <div
          data-radius="radius"
          className="flex flex-col items-center justify-center p-6 py-12"
        >
          {searchQuery ? (
            <EmptyState
              icon={SearchIcon}
              title="No agents found"
              description="No agents match your search criteria. Try adjusting your search."
            />
          ) : (
            <EmptyState
              icon={AgentIcon}
              title="No agents configured"
              description="Create your first agent to get started with AI assistance"
              action={{
                label: "Create Agent",
                onClick: () => setShowCreateDialog(true),
              }}
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={`agent-list-${agent.assistant_id}`}
              agent={agent}
            />
          ))}
        </div>
      )}

      <CreateAgentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        graphId={graphId}
        agentId={agentId}
      />
    </div>
  );
}
