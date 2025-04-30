"use client";

import React from "react";
import { Wrench } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ToolCard, ToolCardLoading } from "./components/tool-card";
import { useMCPContext } from "@/providers/MCP";
import { Badge } from "@/components/ui/badge";
import _ from "lodash";
import { Search } from "@/components/ui/tool-search";
import { useSearchTools } from "@/hooks/use-search-tools";

function TotalToolsBadge({
  toolsCount,
  loading,
}: {
  toolsCount: number;
  loading: boolean;
}) {
  if (loading) {
    return (
      <span className="flex items-center gap-2">
        {" "}
        - <Badge variant="outline">loading...</Badge>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2">
      {" "}
      - <Badge variant="outline">{toolsCount}</Badge>
    </span>
  );
}

/**
 * The parent component containing the tools interface.
 */
export default function ToolsInterface(): React.ReactNode {
  const { tools, loading } = useMCPContext();
  const { toolSearchTerm, debouncedSetSearchTerm, filteredTools } =
    useSearchTools(tools);

  return (
    <div className="flex w-full flex-col gap-4 p-6">
      <div className="flex w-full items-center justify-start gap-6">
        <div className="flex items-center justify-start gap-2">
          <Wrench className="size-6" />
          <p className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            Tools
            <TotalToolsBadge
              toolsCount={tools.length}
              loading={loading}
            />
          </p>
        </div>
        <Search
          onSearchChange={debouncedSetSearchTerm}
          placeholder="Search tools..."
          className="w-full"
        />
      </div>

      <Separator />
      <div className="flex flex-wrap gap-4 space-y-3">
        {loading &&
          !filteredTools.length &&
          Array.from({ length: 6 }).map((_, index) => (
            <ToolCardLoading key={`tool-card-loading-${index}`} />
          ))}
        {filteredTools.map((tool, index) => (
          <ToolCard
            key={`${tool.name}-${index}`}
            tool={tool}
          />
        ))}
        {filteredTools.length === 0 && toolSearchTerm && (
          <p className="my-4 w-full text-center text-sm text-slate-500">
            No tools found matching "{toolSearchTerm}".
          </p>
        )}
        {tools.length === 0 && !toolSearchTerm && !loading && (
          <p className="my-4 w-full text-center text-sm text-slate-500">
            No tools available for this agent.
          </p>
        )}
      </div>
    </div>
  );
}
