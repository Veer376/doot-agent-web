"use client";

import * as React from "react";
import { AgentIcon, ToolsIcon, RAGIcon } from "@/components/icons";
import { useRouter } from "next/navigation";

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
      icon: ToolsIcon,
    },
    {
      title: "RAG",
      url: "/rag",
      icon: RAGIcon,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();

  const handleNewChat = () => {
    // Navigate to base path without threadId (creates new thread)
    router.push("/");
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
