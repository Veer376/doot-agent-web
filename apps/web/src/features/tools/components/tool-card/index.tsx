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
import { Skeleton } from "@/components/ui/skeleton";

interface ToolCardProps {
  tool: Tool;
}

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle className="w-fit max-w-[95%] truncate rounded bg-gray-100 px-2 py-1 font-mono font-semibold tracking-tight text-orange-600">
          {tool.name}
        </CardTitle>
        <CardDescription className="line-clamp-3">
          {tool.description}
        </CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto">
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

export function ToolCardLoading() {
  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <Skeleton className="h-8 w-full" />
        </CardTitle>
        <CardDescription className="mt-2 flex flex-col gap-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-between gap-2">
        <Skeleton className="size-6" />
      </CardFooter>
    </Card>
  );
}
