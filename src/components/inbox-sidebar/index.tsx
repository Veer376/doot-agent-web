"use client";
// components/inbox-sidebar/index.tsx

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  HouseIcon,
  SidebarLeft01Icon,
  SidebarRight01Icon,
} from "@/components/icons";
import React from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { prettifyText } from "../agent-inbox/utils";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { groupAgentsByGraphs, isPrimaryAgent } from "@/lib/agent-utils";
import {
  parseAsString,
  parseAsInteger,
  useQueryState,
} from "@/hooks/use-query-state";
import { useFetchCloudAgents } from "@/hooks/use-cloud-agents";
import { Agent } from "@/types/agent";
import { useThreadsContext } from "../agent-inbox/contexts/ThreadContext";

// Internal component that uses the context
function InboxSidebarInternal() {
  const { setThreadData, fetchThreads } = useThreadsContext();
  const { data: agents = [], isLoading: loading } = useFetchCloudAgents();
  const [agentInboxId, setAgentInboxId] = useQueryState("agentInbox");

  const [_offset, setOffset] = useQueryState(
    "offset",
    parseAsInteger.withDefault(0),
  );
  const [_limit, setLimit] = useQueryState(
    "limit",
    parseAsInteger.withDefault(10),
  );
  const [_inbox, setInbox] = useQueryState(
    "inbox",
    parseAsString.withDefault("interrupted"),
  );

  const lastSelectedAgentRef = React.useRef<string | null>(null);

  // Function to handle agent selection
  const handleAgentSelect = async (agent: Agent) => {
    const agentId = agent.assistant_id;

    // Skip if already selected to prevent loops
    if (agentId === agentInboxId) return;

    // Update ref to track last selected agent
    lastSelectedAgentRef.current = agentId;

    // Update selected agent in context
    await setAgentInboxId(agentId);
    setThreadData([]);

    await setOffset(0);
    await setLimit(10);
    await setInbox("interrupted");

    await fetchThreads(agentId);
  };

  return (
    <Sidebar
      className="border-l border-r-0 border-border bg-sidebar"
      side="right"
    >
      <SidebarContent className="flex h-screen flex-col pb-9 pt-6">
        <div className="flex items-center justify-between px-5">
          <InboxSidebarTrigger
            isOutside={false}
            className="mt-1"
          />
        </div>
        <SidebarGroup className="flex-1 overflow-y-auto pt-6">
          <SidebarGroupContent className="h-full">
            <SidebarMenu className="flex h-full flex-col justify-between gap-2">
              <div className="flex flex-col gap-2 pl-5">
                {loading ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground">
                    Loading agents...
                  </div>
                ) : agents.length === 0 ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground">
                    No agents available
                  </div>
                ) : (
                  <>
                    {/* Group agents by graph */}
                    {groupAgentsByGraphs(agents).map(
                      (graphAgents, groupIdx) => {
                        if (graphAgents.length === 0) return null;

                        const graphId = graphAgents[0].graph_id;

                        return (
                          <React.Fragment key={`graph-${graphId}-${groupIdx}`}>
                            {graphAgents.map((agent) => {
                              const label =
                                agent.name || prettifyText(agent.graph_id);
                              const isPrimary = isPrimaryAgent(agent);
                              const isSelected =
                                agentInboxId === agent.assistant_id;

                              return (
                                <SidebarMenuItem
                                  key={`agent-${agent.assistant_id}`}
                                  className={cn(
                                    "flex w-full items-center justify-between",
                                    isSelected
                                      ? "bg-muted dark:bg-accent"
                                      : "",
                                  )}
                                  data-radius="control"
                                >
                                  <TooltipProvider>
                                    <Tooltip delayDuration={200}>
                                      <TooltipTrigger asChild>
                                        <SidebarMenuButton
                                          onClick={() =>
                                            handleAgentSelect(agent)
                                          }
                                        >
                                          <HouseIcon className="h-5 w-5 text-semantic-success" />
                                          <span
                                            className={cn(
                                              "min-w-0 truncate font-medium",
                                              isSelected
                                                ? "text-foreground"
                                                : "text-muted-foreground",
                                            )}
                                          >
                                            {isPrimary
                                              ? "Primary agent"
                                              : label}
                                          </span>
                                        </SidebarMenuButton>
                                      </TooltipTrigger>
                                      <TooltipContent>{label}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </SidebarMenuItem>
                              );
                            })}
                            {groupIdx <
                              groupAgentsByGraphs(agents).length - 1 && (
                              <div className="my-2 h-px bg-border" />
                            )}
                          </React.Fragment>
                        );
                      },
                    )}
                  </>
                )}
              </div>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

// Exported component with the provider
export function InboxSidebar() {
  return <InboxSidebarInternal />;
}

const sidebarTriggerSVG = <SidebarLeft01Icon size="xs" />;

export function InboxSidebarTrigger({
  isOutside,
  className,
}: {
  isOutside: boolean;
  className?: string;
}) {
  const { toggleSidebar, open } = useSidebar();

  if (isOutside && open) {
    // If this component is being rendered outside the sidebar view, then do not render if open.
    // This way we can render the trigger inside the main view when open.
    return null;
  }

  return (
    <TooltipIconButton
      tooltip="Toggle Inbox Sidebar"
      onClick={toggleSidebar}
      className={cn(className, isOutside && "absolute right-4 top-4 z-50")}
    >
      {isOutside ? (
        // Custom icon when outside, pointing to the right
        <SidebarRight01Icon size="xs" />
      ) : (
        sidebarTriggerSVG
      )}
    </TooltipIconButton>
  );
}
