"use client";

import {
  groupAgentsByGraphs,
  isDefaultAssistant,
  sortAgentGroup,
} from "@/lib/agent-utils";
import { useAgentsContext } from "@/providers/Agents";
import React from "react";
import { AgentCard, LoadingAgentCard } from "./components/agent-card";
import { getDeployments } from "@/lib/environment/deployments";
import { Separator } from "@/components/ui/separator";
import { Computer } from "lucide-react";
import { GraphSVG } from "@/components/icons/graph";
import { CreateAgentDialog } from "./components/create-agent-dialog";
import { Skeleton } from "@/components/ui/skeleton";

function AgentsLoading() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-start gap-4 text-gray-700">
        <div className="flex items-center justify-start">
          <GraphSVG />
          <Skeleton className="h-8 w-[100px]" />
        </div>
        <Skeleton className="size-6 rounded-full" />
      </div>

      <div className="flex w-full gap-2 overflow-x-auto">
        {Array.from({ length: 3 }).map((_, index) => (
          <LoadingAgentCard key={`LoadingAgentCard-${index}`} />
        ))}
      </div>
    </div>
  );
}

/**
 * The parent component containing the agents interface.
 */
export default function AgentsInterface(): React.ReactNode {
  const { agents, loading } = useAgentsContext();
  const deployments = getDeployments();

  return (
    <div className="flex flex-col gap-16 p-6">
      {deployments.map((deployment) => {
        const agentsGroupedByGraphs = groupAgentsByGraphs(
          agents.filter((agent) => agent.deploymentId === deployment.id),
        );

        return (
          <div
            key={deployment.id}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center justify-start gap-2">
              <Computer className="size-6" />
              <p className="text-lg font-semibold tracking-tight">
                {deployment.name}
              </p>
            </div>
            <Separator />
            <div className="flex flex-col gap-4">
              {agentsGroupedByGraphs?.length > 0 && !loading ? (
                agentsGroupedByGraphs.map((agentGroup) => {
                  const sortedAgentGroup = sortAgentGroup(agentGroup);
                  const defaultAgent =
                    sortedAgentGroup.find((a) => isDefaultAssistant(a)) ??
                    sortedAgentGroup[0];
                  return (
                    <div
                      key={defaultAgent.graph_id}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-start gap-4 text-gray-700">
                        <div className="flex items-center justify-start">
                          <GraphSVG />
                          <p className="font-medium tracking-tight">
                            {defaultAgent.graph_id}
                          </p>
                        </div>
                        <CreateAgentDialog
                          deploymentId={defaultAgent.deploymentId}
                          graphId={defaultAgent.graph_id}
                          agentId={defaultAgent.assistant_id}
                        />
                      </div>

                      <div className="flex w-full gap-2 overflow-x-auto">
                        {sortedAgentGroup.map((agent, index) => (
                          <AgentCard
                            key={`${agent.assistant_id}-${index}`}
                            agent={agent}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <AgentsLoading />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
