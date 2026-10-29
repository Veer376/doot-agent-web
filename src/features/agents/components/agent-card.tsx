"use client";

import { useState } from "react";
import {
  BotIcon as Bot,
  BrainIcon as Brain,
  EditIcon as Edit,
  UserIconHuge as User,
  WrenchIcon as Wrench,
} from "@/components/icons";
import { Comment01Icon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Agent } from "@/types/agent";
import { EditAgentDialog } from "./create-edit-agent-dialogs/edit-agent-dialog";
import _ from "lodash";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isPrimaryAgent } from "@/lib/agent-utils";

function SupportedConfigBadge({
  type,
}: {
  type: "rag" | "tools" | "supervisor";
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          {type === "rag" && (
            <Badge variant="secondary">
              <Brain />
              RAG
            </Badge>
          )}
          {type === "tools" && (
            <Badge variant="secondary">
              <Wrench />
              MCP Tools
            </Badge>
          )}
          {type === "supervisor" && (
            <Badge variant="secondary">
              <User />
              Supervisor
            </Badge>
          )}
        </TooltipTrigger>
        <TooltipContent>This agent supports {type}.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface AgentCardProps {
  agent: Agent;
  showDeployment?: boolean;
}

export function AgentCard({ agent, showDeployment }: AgentCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const isPrimary = isPrimaryAgent(agent);

  return (
    <>
      <Card
        key={agent.assistant_id}
        className="doot-route-card overflow-hidden py-4"
        data-radius="surface"
      >
        <CardHeader className="space-y-1.5 pb-1">
          <div className="flex items-start justify-between">
            <CardTitle className="flex w-full flex-wrap items-center gap-2">
              <p>{agent.name}</p>
              {showDeployment && (
                <div className="flex flex-wrap items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline">
                          <Bot />
                          {agent.graph_id}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        Agent’s corresponding graph
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </CardTitle>
          </div>
          <div className="flex-0 flex flex-wrap items-center justify-start gap-2">
            {agent.metadata?.description &&
            typeof agent.metadata.description === "string" ? (
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                {agent.metadata.description}
              </p>
            ) : null}
            {agent.supportedConfigs?.map((config) => (
              <SupportedConfigBadge
                key={`${agent.assistant_id}-${config}`}
                type={config}
              />
            ))}
          </div>
        </CardHeader>
        <CardFooter className="mt-auto flex w-full justify-between pt-1">
          {!isPrimary && (
            <Button
              variant="outline"
              size="sm"
              data-radius="control"
              onClick={() => setShowEditDialog(true)}
            >
              <Edit className="mr-2 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
          <Link
            href={`/?agentId=${agent.assistant_id}`}
            className="ml-auto"
          >
            <Button
              size="sm"
              data-radius="control"
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              <Comment01Icon className="mr-1 h-3.5 w-3.5" />
              Chat
            </Button>
          </Link>
        </CardFooter>
      </Card>
      <EditAgentDialog
        agent={agent}
        open={showEditDialog}
        onOpenChange={(open: boolean) => setShowEditDialog(open)}
      />
    </>
  );
}
