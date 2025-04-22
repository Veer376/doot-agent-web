"use client";

import { Tool } from "@/types/tool";
import React, { useEffect, useState } from "react";
import useMCP from "@/hooks/use-mcp";
import { Wrench } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ToolCard } from "./components/tool-card";
import { DUMMY_TOOLS } from "./dummy";

/**
 * The parent component containing the tools interface.
 */
export default function ToolsInterface(): React.ReactNode {
  const [tools, setTools] = useState<Tool[]>(DUMMY_TOOLS);
  const { getTools } = useMCP();

  useEffect(() => {
    if (tools.length) return;

    getTools("http://localhost:8000", {
      name: "Tools Interface",
      version: "1.0.0",
    }).then((tools) => setTools(tools));
  }, []);

  return (
    <div className="flex w-full flex-col gap-4 p-6">
      <div className="flex items-center justify-start gap-2">
        <Wrench className="size-6" />
        <p className="text-lg font-semibold tracking-tight">Tools</p>
      </div>
      <Separator />
      <div className="flex flex-wrap gap-4 space-y-3">
        {tools.map((tool, index) => (
          <ToolCard
            key={`${tool.name}-${index}`}
            tool={tool}
          />
        ))}
      </div>
    </div>
  );
}
