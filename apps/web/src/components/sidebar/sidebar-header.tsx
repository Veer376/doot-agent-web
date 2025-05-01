"use client";

import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { LangGraphLogoSVG } from "../icons/langgraph";
import NextLink from "next/link";
import { useSidebar } from "@/components/ui/sidebar";

export function SiteHeader() {
  const { open } = useSidebar();
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            asChild
            className="flex items-center justify-center"
          >
            <NextLink href="/">
              {open ? (
                <>
                  <LangGraphLogoSVG className="!h-4 !w-auto flex-shrink-0" />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      Open Agent Platform
                    </span>
                  </div>
                </>
              ) : (
                <LangGraphLogoSVG className="!h-4 !w-auto flex-shrink-0" />
              )}
            </NextLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}
