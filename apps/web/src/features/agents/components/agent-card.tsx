"use client";

import { useState } from "react";
import {
  Bot,
  Brain,
  Cloud,
  Edit,
  MessageSquare,
  User,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Agent } from "@/types/agent";
import { EditAgentDialog } from "./create-edit-agent-dialogs/edit-agent-dialog";
import _ from "lodash";
import NextLink from "next/link";
import { Badge } from "@/components/ui/badge";
import { getDeployments } from "@/lib/environment/deployments";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AgentCardProps {
  agent: Agent;
  showDeployment?: boolean;
}

export function AgentCard({ agent, showDeployment }: AgentCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const deployments = getDeployments();
  const selectedDeployment = deployments.find(
    (d) => d.id === agent.deploymentId,
  );

  return (
    <>
      <Card
        key={agent.assistant_id}
        className="overflow-hidden"
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="flex w-full flex-wrap items-center gap-2">
              <p>{_.startCase(agent.name)}</p>
              {showDeployment && selectedDeployment && (
                <div className="flex flex-wrap items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline">
                          <Cloud />
                          {_.startCase(selectedDeployment.name)}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        The deployment the graph & agent belongs to.
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline">
                          <Bot />
                          {_.startCase(agent.graph_id)}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        The graph the agent belongs to.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </CardTitle>
          </div>
          {agent.metadata?.description &&
          typeof agent.metadata.description === "string" ? (
            <p className="text-muted-foreground mt-1 text-sm">
              {agent.metadata.description}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-start gap-2">
          {agent.supportedConfigs?.includes("tools") && (
            <Badge variant="info">
              <Wrench />
              Tools
            </Badge>
          )}
          {agent.supportedConfigs?.includes("rag") && (
            <Badge variant="brand">
              <Brain />
              RAG
            </Badge>
          )}
          {agent.supportedConfigs?.includes("supervisor") && (
            <Badge variant="brand">
              <User />
              Supervisor
            </Badge>
          )}
        </CardContent>
        <CardFooter className="mt-auto flex justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowEditDialog(true);
            }}
          >
            <Edit className="mr-2 h-3.5 w-3.5" />
            Edit
          </Button>
          <NextLink
            href={`/?agentId=${agent.assistant_id}&deploymentId=${agent.deploymentId}`}
          >
            <Button size="sm">
              <MessageSquare className="mr-2 h-3.5 w-3.5" />
              Chat
            </Button>
          </NextLink>
        </CardFooter>
      </Card>
      <EditAgentDialog
        agent={agent}
        open={showEditDialog}
        onOpenChange={(c) => {
          setShowEditDialog(c);
        }}
      />
    </>
  );
}
