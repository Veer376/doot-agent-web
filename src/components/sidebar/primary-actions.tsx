"use client";

import { NewThreadIcon } from "@/components/icons";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

interface PrimaryActionsProps {
  onNewChat: () => void;
}

export function PrimaryActions({ onNewChat }: PrimaryActionsProps) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {/* New Chat Button */}
        <SidebarMenuItem>
          <SidebarMenuButton onClick={onNewChat} className="w-full">
            <NewThreadIcon />
            <span>New chat</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
