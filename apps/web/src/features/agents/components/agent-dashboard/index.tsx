"use client";

import { useState } from "react";
import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgentCard } from "../agent-card";
import { CreateAgentDialog } from "../create-edit-agent-dialogs/create-agent-dialog";
import { useAgentsContext } from "@/providers/Agents";

export function AgentDashboard() {
  const { agents } = useAgentsContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [graphFilter, setGraphFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const filteredAgents = agents.filter((agent) => {
    // Apply search filter
    if (
      searchQuery &&
      !agent.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Apply graph filter
    if (graphFilter !== "all" && agent.graph_id !== graphFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-sm">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Search agents..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="text-muted-foreground h-4 w-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          <Select
            value={graphFilter}
            onValueChange={setGraphFilter}
          >
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="All Graphs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Graphs</SelectItem>
              {mockGraphs.map((graph) => (
                <SelectItem
                  key={graph.id}
                  value={graph.id}
                >
                  {graph.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          {filteredAgents.length}{" "}
          {filteredAgents.length === 1 ? "Agent" : "Agents"}
        </h2>
        <Select defaultValue="newest">
          <SelectTrigger className="h-8 w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredAgents.length === 0 ? (
        <div className="animate-in fade-in-50 flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="bg-muted mx-auto flex h-20 w-20 items-center justify-center rounded-full">
            <Search className="text-muted-foreground h-10 w-10" />
          </div>
          <h2 className="mt-6 text-xl font-semibold">No agents found</h2>
          <p className="text-muted-foreground mt-2 mb-8 text-center">
            We couldn't find any agents matching your search criteria. Try
            adjusting your filters or create a new agent.
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            Create Agent
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={`agent-dashboard-${agent.assistant_id}`}
              agent={agent}
              showDeployment={true}
            />
          ))}
        </div>
      )}

      {/* TODO: Replace with EditAgentDialog */}
      <CreateAgentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}
