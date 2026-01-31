"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { FilterIcon } from "hugeicons-react";
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
import { useFetchCloudAgents } from "@/hooks/use-cloud-agents";
import { GraphGroup } from "../../types";
import { groupAgentsByGraphs } from "@/lib/agent-utils";
import _ from "lodash";

export function AgentDashboard() {
  const { data: agents = [], isLoading: agentsLoading } = useFetchCloudAgents();
  const [searchQuery, setSearchQuery] = useState("");
  const [graphFilter, setGraphFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const allGraphGroups: GraphGroup[] = useMemo(() => {
    if (agentsLoading) return [];

    // Group agents by their graph_id
    const agentsGroupedByGraphs = groupAgentsByGraphs(agents);
    const groups: GraphGroup[] = [];

    agentsGroupedByGraphs.forEach((agentGroup) => {
      if (agentGroup.length > 0) {
        const graphId = agentGroup[0].graph_id;
        groups.push({
          agents: agentGroup,
          graphId,
        });
      }
    });

    return groups;
  }, [agents, agentsLoading]);

  const filteredAgents = useMemo(() => {
    // 1. Filter groups based on the graphFilter dropdown
    let groupsMatchingGraphFilter: GraphGroup[];

    if (graphFilter === "all") {
      groupsMatchingGraphFilter = allGraphGroups;
    } else {
      // Filter by graphId
      groupsMatchingGraphFilter = allGraphGroups.filter(
        (group) => group.graphId === graphFilter,
      );
    }

    // 2. Get all agents from the groups that matched the graph filter
    const agentsInFilteredGroups = groupsMatchingGraphFilter.flatMap(
      (group) => group.agents,
    );

    // 3. Filter these agents based on the search query
    const lowerCaseQuery = searchQuery.toLowerCase();
    if (!lowerCaseQuery) {
      return agentsInFilteredGroups; // No search query, return all agents from filtered groups
    }

    return agentsInFilteredGroups.filter((agent) =>
      agent.name.toLowerCase().includes(lowerCaseQuery),
    );
  }, [allGraphGroups, graphFilter, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              data-radius="radius2"
              className="h-11 pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          <Select
            value={graphFilter}
            onValueChange={setGraphFilter}
          >
            <SelectTrigger
              data-radius="radius2"
              className="h-11 min-w-[180px]"
            >
              <SelectValue placeholder="All Templates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Templates</SelectItem>
              {allGraphGroups.map((graph) => (
                <SelectItem
                  key={graph.graphId}
                  value={graph.graphId}
                >
                  {_.startCase(graph.graphId)}
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
      </div>

      {filteredAgents.length === 0 ? (
        <div
          data-radius="radius2"
          className="flex flex-col items-center justify-center border border-dashed p-8 text-center animate-in fade-in-50"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Search className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="mt-6 text-xl font-semibold">No agents found</h2>
          <p className="mb-8 mt-2 text-center text-muted-foreground">
            We couldn't find any agents matching your search criteria. Try
            adjusting your filters or create a new agent.
          </p>
          <Button
            onClick={() => setShowCreateDialog(true)}
            data-radius="radius2"
            className="h-10 bg-black text-white hover:bg-black/90"
          >
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
