"use client";

import { type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import React from "react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import NextLink from "next/link";
import { cn } from "@/lib/utils";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon | React.ComponentType<any>;
  }[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item, index) => (
          <NextLink
            href={item.url}
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
          </NextLink>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
