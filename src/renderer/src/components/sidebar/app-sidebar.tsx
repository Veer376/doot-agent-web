"use client";

import * as React from "react";
import { useState } from "react";
import { AgentBrainCPU, NewThreadIcon, SearchIcon } from "@/components/icons";
import { ElectricPlugsIcon } from "hugeicons-react";
import { Skeleton } from "@/components/ui/skeleton";

import { NavMain } from "./nav-main";
import { NavFooter } from "./nav-footer";
import { ThreadList } from "./thread-list";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SiteHeader } from "./sidebar-header";
import { MCPServersDialog } from "@/features/mcp";

// This is sample data.
const data = {
  navMain: [
    {
      title: "New Thread",
      url: "/",
      icon: NewThreadIcon,
    },
    {
      title: "Search Threads",
      // Special marker to indicate this is an action, not a navigation link
      action: "search",
      icon: SearchIcon,
    },
    {
      title: "Agents",
      url: "/agents",
      icon: AgentBrainCPU,
    },
    {
      title: "MCP Servers",
      action: "mcp",
      icon: ElectricPlugsIcon,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [showMCPDialog, setShowMCPDialog] = useState(false);

  return (
    <Sidebar
      collapsible="icon"
      {...props}
    >
      <SiteHeader />
      <SidebarContent>
        <NavMain
          items={data.navMain}
          onSearchClick={() => {
            const event = new CustomEvent("openThreadSearch");
            window.dispatchEvent(event);
          }}
          onMCPClick={() => setShowMCPDialog(true)}
        />
        <React.Suspense
          fallback={
            <div className="space-y-2 px-3 py-4">
              <Skeleton
                className="h-10 w-full"
                data-radius="radius2"
              />
              <Skeleton
                className="h-10 w-full"
                data-radius="radius2"
              />
              <Skeleton
                className="h-10 w-full"
                data-radius="radius2"
              />
              <Skeleton
                className="h-10 w-full"
                data-radius="radius2"
              />
              <Skeleton
                className="h-10 w-full"
                data-radius="radius2"
              />
            </div>
          }
        >
          <ThreadList />
        </React.Suspense>
      </SidebarContent>
      <SidebarFooter>
        <NavFooter />
      </SidebarFooter>
      <SidebarRail />

      {/* MCP Servers Dialog */}
      <MCPServersDialog open={showMCPDialog} onOpenChange={setShowMCPDialog} />
    </Sidebar>
  );
}
