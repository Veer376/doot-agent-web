"use client";
import * as React from "react";

import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { DootLogoIcon } from "@/components/icons/app-icons";
import {
  Menu11Icon,
  SidebarLeft01Icon,
  SidebarRight01Icon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { state, toggleSidebar, setOpenMobile, railHovered } = useSidebar();
  const [hovered, setHovered] = React.useState(false);

  // Combine local hover state with rail hover state
  const isHovered = hovered || railHovered;

  return (
    <SidebarHeader className="pt-2 pb-1">
      <SidebarMenu>
        <SidebarMenuItem>
          {/* Desktop: logo swaps to sidebar toggle icon on hover */}
          <SidebarMenuButton
            size="default"
            aria-label={
              state === "expanded" ? "Collapse sidebar" : "Expand sidebar"
            }
            className={cn("flex items-center gap-2 px-2", "hidden md:flex")}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={toggleSidebar}
          >
            {isHovered ? (
              state === "expanded" ? (
                <SidebarLeft01Icon size="sm" />
              ) : (
                <SidebarRight01Icon size="sm" />
              )
            ) : (
              <DootLogoIcon size={28} />
            )}
            {/* Keep brand name visible only when not collapsed */}
            <div className="grid flex-1 pl-0 text-left text-sm leading-none transition-all group-data-[collapsible=icon]:opacity-0">
              <span className="truncate font-medium">DootAgent</span>
            </div>
          </SidebarMenuButton>

          {/* Mobile: dedicated menu icon to open sidebar */}
          <SidebarMenuButton
            size="default"
            aria-label="Close sidebar"
            className="flex h-11 items-center gap-2 p-2 md:hidden"
            onClick={() => setOpenMobile(false)}
          >
            <DootLogoIcon
              size={24}
              aria-hidden="true"
            />
            <span className="flex-1 text-left font-semibold">DootAgent</span>
            <Menu11Icon
              size="sm"
              aria-hidden="true"
            />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}
