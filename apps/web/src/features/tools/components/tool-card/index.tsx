import * as React from "react";

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tool } from "@/types/tool";
import { ToolDetailsDialog } from "../tool-details-dialog";
import { Eye } from "lucide-react";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";

interface ToolCardProps {
  tool: Tool;
}

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <p className="rounded bg-gray-100 px-2 py-1 font-mono font-semibold tracking-tight text-orange-600">
            {tool.name}
          </p>
        </CardTitle>
        <CardDescription>{tool.description}</CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-between gap-2">
        <ToolDetailsDialog tool={tool}>
          <TooltipIconButton
            tooltip="View tool details"
            variant="default"
            className="size-7"
          >
            <Eye className="size-4" />
          </TooltipIconButton>
        </ToolDetailsDialog>
      </CardFooter>
    </Card>
  );
}
