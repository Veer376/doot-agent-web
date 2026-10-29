"use client";

import { AgentInbox } from "@/components/agent-inbox";
import React from "react";
import { ThreadsProvider } from "@/components/agent-inbox/contexts/ThreadContext";
import { DootLogoIcon } from "@/components/icons";
import { Toaster } from "@/components/ui/sonner";
import { InboxSidebar, InboxSidebarTrigger } from "@/components/inbox-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import {} from "@/components/ui/breadcrumb";

export default function InboxPage(): React.ReactNode {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center">
          <DootLogoIcon
            className="animate-pulse"
            size={48}
          />
        </div>
      }
    >
      <Toaster />
      <ThreadsProvider>
        <div className="doot-inbox-page flex min-h-full w-full min-w-0 flex-row">
          <div className="min-w-0 flex-1">
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
