"use client";

import * as React from "react";
import { AgentIcon, NewThreadIcon } from "@/components/icons";

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
      title: "Agents",
      url: "/agents",
      icon: AgentIcon,
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
        <NavMain items={data.navMain} />
        <ThreadList />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
