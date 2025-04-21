"use client";

import { groupAgentsByGraphs, sortAgentGroup } from "@/lib/agent-utils";
import { useAgentsContext } from "@/providers/Agents";
import React from "react";
import { AgentCard } from "./components/agent-card";
import { getDeployments } from "@/lib/environment/deployments";
import { Separator } from "@/components/ui/separator";
import { CirclePlus, Computer } from "lucide-react";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { GraphSVG } from "@/components/icons/graph";

/**
 * The parent component containing the agents interface.
 */
export default function AgentsInterface(): React.ReactNode {
  const { agents } = useAgentsContext();
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
              {agentsGroupedByGraphs.map((agentGroup) => {
                const sortedAgentGroup = sortAgentGroup(agentGroup);
                return (
                  <div
                    key={agentGroup[0].graph_id}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-start gap-4 text-gray-700">
                      <div className="flex items-center justify-start">
                        <GraphSVG />
                        <p className="font-medium tracking-tight">
                          {agentGroup[0].graph_id}
                        </p>
                      </div>
                      <TooltipIconButton
                        onClick={() => alert("New agent not implemented")}
                        className="size-8"
                        tooltip="New Agent"
                        delayDuration={200}
                      >
                        <CirclePlus className="size-5" />
                      </TooltipIconButton>
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
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
