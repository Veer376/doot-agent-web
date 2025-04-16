"use client";

import { type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import NextLink from "next/link";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
  }[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item, index) => (
          <NextLink href={item.url} key={`${item.title}-${index}`}>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={item.title}>
                {item.icon && <item.icon />}
                <span className={pathname === item.url ? "text-red-500" : ""}>
                  {item.title}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </NextLink>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
