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
                  className="h-9 gap-3 font-medium"
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          // Handle navigation items
          return (
            <SidebarMenuItem
              key={`${item.title}-${index}`}
              className={item.url === "/agents" ? "mt-3" : undefined}
            >
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                className={
                  item.url === "/agents"
                    ? "text-muted-foreground h-9 gap-3"
                    : "h-9 gap-3 font-medium"
                }
                // Treat "/" as an action link: don't mark it active to avoid persistent highlight
                isActive={item.url !== "/" && pathname === item.url}
              >
                <Link href={item.url || "/"}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
