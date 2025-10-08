"use client";

import { AgentInbox } from "@/components/agent-inbox";
import React from "react";
import { ThreadsProvider } from "@/components/agent-inbox/contexts/ThreadContext";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Menu11Icon } from "@/components/icons";
import { Toaster } from "@/components/ui/sonner";
import { InboxSidebar, InboxSidebarTrigger } from "@/components/inbox-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import {} from "@/components/ui/breadcrumb";

export default function InboxPage(): React.ReactNode {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <Toaster />
      <ThreadsProvider>
        <div className="flex min-h-full w-full flex-row">
          {/* Main content with a mobile-only menu trigger */}
          <div className="w-full">
            <header className="flex items-center gap-2 px-4 py-2 md:hidden">
              <SidebarTrigger icon={<Menu11Icon />} />
            </header>

            <div className="flex h-full w-full flex-col">
              <AgentInbox />
            </div>
          </div>

          {/* Right sidebar for inbox */}
          <div className="flex-none">
            <SidebarProvider style={{ width: "auto" }}>
              <InboxSidebar />
              <InboxSidebarTrigger isOutside={true} />
            </SidebarProvider>
          </div>
        </div>
      </ThreadsProvider>
    </React.Suspense>
  );
}
