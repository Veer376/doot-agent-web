"use client";

import * as React from "react";
import { AgentBrainCPU, NewThreadIcon, SearchIcon } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";

import { NavMain } from "./nav-main";
import { NavFooter } from "./nav-footer";
import { ThreadList } from "./thread-list";
import { ThreadSearchDialog } from "./thread-search-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { SiteHeader } from "./sidebar-header";

// This is sample data.
const data = {
  navMain: [
    {
      title: "New chat",
      url: "/",
      icon: NewThreadIcon,
    },
    {
      title: "Search chats",
      // Special marker to indicate this is an action, not a navigation link
      action: "search",
      icon: SearchIcon,
    },
    {
      title: "Agents",
      url: "/agents",
      icon: AgentBrainCPU,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isMobile, setOpenMobile } = useSidebar();
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);

  const openThreadSearch = React.useCallback(() => {
    const dispatchSearch = () => {
      const event = new CustomEvent("openThreadSearch");
      window.dispatchEvent(event);
    };

    if (!isMobile) {
      dispatchSearch();
      return;
    }

    setOpenMobile(false);
    window.setTimeout(() => setMobileSearchOpen(true), 320);
  }, [isMobile, setOpenMobile]);

  return (
    <>
      <Sidebar
      collapsible="icon"
      {...props}
    >
      <SiteHeader />
      <SidebarContent className="gap-1">
        <NavMain
          items={data.navMain}
          onSearchClick={openThreadSearch}
        />
        <React.Suspense
          fallback={
            <div className="space-y-2 px-3 py-4">
              <Skeleton
                className="h-10 w-full"
                data-radius="surface"
              />
              <Skeleton
                className="h-10 w-full"
                data-radius="surface"
              />
              <Skeleton
                className="h-10 w-full"
                data-radius="surface"
              />
              <Skeleton
                className="h-10 w-full"
                data-radius="surface"
              />
              <Skeleton
                className="h-10 w-full"
                data-radius="surface"
              />
            </div>
          }
        >
          <ThreadList />
        </React.Suspense>
      </SidebarContent>
      <SidebarFooter>
        <NavFooter />
      </SidebarFooter>
        <SidebarRail className="hover:after:bg-sidebar-border after:bg-transparent" />
      </Sidebar>
      {isMobile && (
        <ThreadSearchDialog
          open={mobileSearchOpen}
          onOpenChange={setMobileSearchOpen}
        />
      )}
    </>
  );
}
