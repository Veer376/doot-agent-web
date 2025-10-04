"use client";

import * as React from "react";
import { Wrench, MessageCircle, Brain } from "lucide-react";
import { AgentIcon } from "@/components/icons";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { ThreadList } from "./thread-list";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { SiteHeader } from "./sidebar-header";

// This is sample data.
const data = {
  navMain: [
    {
      title: "Agents",
      url: "/agents",
      icon: AgentIcon,
    },
    {
      title: "Tools",
      url: "/tools",
      icon: Wrench,
    },
    // {
    //   title: "Inbox",
    //   url: "/inbox",
    //   icon: Inbox,
    // },
    {
      title: "RAG",
      url: "/rag",
      icon: Brain,
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
        <SidebarSeparator />
        <ThreadList />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
