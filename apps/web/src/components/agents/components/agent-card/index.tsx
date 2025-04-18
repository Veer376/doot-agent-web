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
import NextLink from "next/link"; // Add this import
import { SquareArrowOutUpRight } from "lucide-react";

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const isDefault = isDefaultAssistant(agent);

  return (
    <Card className="w-[350px]">
      <CardHeader>
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
      <CardFooter className="flex justify-between gap-2">
        <Button
          onClick={() => alert("Inspect not implemented")}
          variant="outline"
          className="w-1/4"
        >
          Inspect
        </Button>
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
