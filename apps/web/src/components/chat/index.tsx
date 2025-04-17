"use client";

import React from "react";
import { StreamProvider } from "@/components/chat/providers/Stream";
import { Thread } from "./components/thread";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ConfigurationSidebar } from "./components/configuration-sidebar";
import { Settings } from "lucide-react";

/**
 * The parent component containing the chat interface.
 */
export default function ChatInterface(): React.ReactNode {
  return (
    <StreamProvider>
      <SidebarProvider>
        <SidebarInset>
          <Thread />
        </SidebarInset>
        {/* Sidebar trigger for the agent configuration sidebar */}
        <SidebarTrigger icon={<Settings />} />
        <ConfigurationSidebar className="-mr-1" side="right" />
      </SidebarProvider>
    </StreamProvider>
  );
}
