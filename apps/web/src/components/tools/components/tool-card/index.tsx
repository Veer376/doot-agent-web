import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tool } from "@/types/tool";
import { ToolDetailsDialog } from "../tool-details-dialog";

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
          <Button className="w-full">Inspect</Button>
        </ToolDetailsDialog>
      </CardFooter>
    </Card>
  );
}
