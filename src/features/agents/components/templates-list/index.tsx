"use client";

import { useState, useEffect, useMemo } from "react";
import { SearchIcon } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { CreateAgentDialog } from "../create-edit-agent-dialogs/create-agent-dialog";
import { TemplateCard } from "./templates-card";
import { useFetchCloudAgents } from "@/hooks/use-cloud-agents";
import { groupAgentsByGraphs } from "@/lib/agent-utils";
import { TemplatesLoading } from "./templates-loading";
import { GraphGroup } from "../../types";

export function TemplatesList() {
  const { data: agents = [], isLoading: agentsLoading } = useFetchCloudAgents();

  const [searchQueryState, setSearchQueryState] = useState("");
  const [openTemplatesState, setOpenTemplatesState] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const allGraphGroups: GraphGroup[] = useMemo(() => {
    if (agentsLoading) return [];
    const groups: GraphGroup[] = [];

    const agentsGroupedByGraphs = groupAgentsByGraphs(agents);
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

  const filteredGraphGroupsState = useMemo(() => {
    const lowerCaseQuery = searchQueryState.toLowerCase();
    return allGraphGroups.filter(
      (group) =>
        group.graphId.toLowerCase().includes(lowerCaseQuery) ||
        group.agents.some((agent) =>
          agent.name.toLowerCase().includes(lowerCaseQuery),
        ),
    );
  }, [allGraphGroups, searchQueryState]);

  const toggleGraphState = (graphId: string) => {
    const uniqueGraphKey = graphId;
    setOpenTemplatesState((prev) =>
      prev.includes(uniqueGraphKey)
        ? prev.filter((key) => key !== uniqueGraphKey)
        : [...prev, uniqueGraphKey],
    );
  };

  if (!isMounted || agentsLoading) {
    return <TemplatesLoading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by graph or agent name..."
            className="pl-8"
            value={searchQueryState}
            onChange={(e) => setSearchQueryState(e.target.value)}
          />
        </div>
      </div>

      {filteredGraphGroupsState.length === 0 ? (
        <div
          data-radius="radius"
          className="flex flex-col items-center justify-center border border-dashed p-8 text-center animate-in fade-in-50"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <SearchIcon className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="mt-6 text-xl font-semibold">No graphs found</h2>
          <p className="mb-8 mt-2 text-center text-muted-foreground">
            {searchQueryState
              ? "We couldn't find any graphs matching your search."
              : "There are no agent graphs configured yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredGraphGroupsState.map(({ agents: agentGroup, graphId }) => {
            const uniqueGraphKey = graphId;
            return (
              <TemplateCard
                key={uniqueGraphKey}
                agents={agentGroup}
                toggleGraph={() => toggleGraphState(graphId)}
                isOpen={openTemplatesState.includes(uniqueGraphKey)}
              />
            );
          })}
        </div>
      )}

      <CreateAgentDialog
        open={false}
        onOpenChange={() => {}}
      />
    </div>
  );
}
