import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Agent } from "@/types/agent";
import { isDefaultAssistant } from "@/lib/agent-utils";
import { DefaultStar } from "@/components/ui/default-star";
import NextLink from "next/link";
import { SquareArrowOutUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EditAgentDialog } from "../edit-agent-dialog";

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const isDefault = isDefaultAssistant(agent);

  return (
    <Card className="w-[350px] flex-shrink-0">
      <CardHeader className="w-full">
        <CardTitle className="flex items-center justify-between">
          <span>{isDefault ? "Default agent" : agent.name}</span>
          {isDefault && <DefaultStar className="opacity-100" />}
        </CardTitle>
        {agent.metadata?.description ? (
          <CardDescription>
            {agent.metadata.description as string}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardFooter className="flex w-full justify-between gap-2">
        <EditAgentDialog agent={agent} />
        <NextLink
          href={`/?agentId=${agent.assistant_id}&deploymentId=${agent.deploymentId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-3/4"
        >
          <Button
            variant="brand"
            className="w-full"
          >
            <SquareArrowOutUpRight className="size-4" />
            <span>Chat</span>
          </Button>
        </NextLink>
      </CardFooter>
    </Card>
  );
}

export function LoadingAgentCard() {
  return (
    <Card className="w-[350px] flex-shrink-0">
      <CardHeader className="w-full">
        <CardTitle className="flex items-center justify-between">
          <Skeleton className="h-6 w-1/2" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-5 w-3/4" />
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex w-full justify-between gap-2">
        <Skeleton className="h-9 w-1/4" />
        <Skeleton className="h-9 w-3/4" />
      </CardFooter>
    </Card>
  );
}
