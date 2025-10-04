"use client";

import * as React from "react";
import { Wrench, Brain } from "lucide-react";
import { AgentIcon } from "@/components/icons";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { ThreadList } from "./thread-list";
import { PrimaryActions } from "./primary-actions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SiteHeader } from "./sidebar-header";
import { useQueryState } from "nuqs";

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
    {
      title: "RAG",
      url: "/rag",
      icon: Brain,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [, setThreadId] = useQueryState("threadId");

  const handleNewChat = () => {
    setThreadId(null); // Setting to null creates new thread
  };

  return (
    <Sidebar
      collapsible="icon"
      {...props}
    >
      <SiteHeader />
      <SidebarContent>
        <PrimaryActions onNewChat={handleNewChat} />
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
