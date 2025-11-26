"use client";
import * as React from "react";

import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { OrbitLogoIcon } from "@/components/icons/app-icons";
import {
  Menu11Icon,
  SidebarLeft01Icon,
  SidebarRight01Icon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { state, toggleSidebar, railHovered } = useSidebar();
  const [hovered, setHovered] = React.useState(false);

  // Combine local hover state with rail hover state
  const isHovered = hovered || railHovered;

  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          {/* Desktop: logo swaps to sidebar toggle icon on hover */}
          <SidebarMenuButton
            size="default"
            className={cn("flex h-8 items-center gap-2 p-2", "hidden md:flex")}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => isHovered && toggleSidebar()}
          >
            {isHovered ? (
              state === "expanded" ? (
                <SidebarLeft01Icon size="sm" />
              ) : (
                <SidebarRight01Icon size="sm" />
              )
            ) : (
              <OrbitLogoIcon />
            )}
            {/* Keep brand name visible only when not collapsed */}
            <div className="grid flex-1 pl-0 text-left text-sm leading-none transition-all group-data-[collapsible=icon]:opacity-0">
              <span className="truncate font-semibold">Orbit Agent</span>
            </div>
          </SidebarMenuButton>

          {/* Mobile: dedicated menu icon to open sidebar */}
          <SidebarMenuButton
            size="default"
            className="flex h-8 items-center gap-2 p-2 md:hidden"
            onClick={toggleSidebar}
          >
            <Menu11Icon size="sm" />
            <span className="sr-only">Toggle Sidebar</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}
