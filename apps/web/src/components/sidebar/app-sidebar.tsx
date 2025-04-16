"use client";

import * as React from "react";
import { BookOpen, Bot, Settings2, SquareTerminal } from "lucide-react";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SiteHeader } from "./sidebar-header";

// This is sample data.
const data = {
  user: {
    name: "John Doe",
    email: "johndoe@langchain.dev",
    avatar: "",
  },
  navMain: [
    {
      title: "Chat",
      url: "/chat",
      icon: SquareTerminal,
    },
    {
      title: "Agents",
      url: "/agents",
      icon: Bot,
    },
    {
      title: "Tools",
      url: "/tools",
      icon: BookOpen,
    },
    {
      title: "Inbox",
      url: "/inbox",
      icon: Settings2,
    },
    {
      title: "RAG",
      url: "/rag",
      icon: Settings2,
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
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
