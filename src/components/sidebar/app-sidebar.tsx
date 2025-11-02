"use client";

import * as React from "react";
import { AgentBrainCPU, NewThreadIcon, SearchIcon } from "@/components/icons";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { ThreadList } from "./thread-list";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SiteHeader } from "./sidebar-header";

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
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="icon"
      {...props}
    >
      <SiteHeader />
      <SidebarContent>
        <NavMain items={data.navMain} onSearchClick={() => {
          const event = new CustomEvent('openThreadSearch');
          window.dispatchEvent(event);
        }} />
        <ThreadList />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
