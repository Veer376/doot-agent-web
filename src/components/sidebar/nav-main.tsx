"use client";

import { type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import React from "react";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
  onSearchClick,
}: {
  items: {
    title: string;
    url?: string;
    action?: string;
    icon?: LucideIcon | React.ComponentType<any>;
  }[];
  onSearchClick?: () => void;
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item, index) => {
          // Handle action items (like Search)
          if (item.action === "search") {
            return (
              <SidebarMenuItem key={`${item.title}-${index}`}>
                <SidebarMenuButton
                  tooltip={item.title}
                  onClick={onSearchClick}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          // Handle navigation items
          return (
            <Link
              href={item.url || "/"}
              key={`${item.title}-${index}`}
            >
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={item.title}
                  // Treat "/" as an action link: don't mark it active to avoid persistent highlight
                  isActive={item.url !== "/" && pathname === item.url}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </Link>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
