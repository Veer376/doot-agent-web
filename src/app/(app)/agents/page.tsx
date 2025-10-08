"use client";

import AgentsInterface from "@/features/agents";
import { Toaster } from "@/components/ui/sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Menu11Icon } from "@/components/icons";
import React from "react";

/**
 * The /agents page.
 * Contains the list of all agents the user has access to.
 */
export default function AgentsPage(): React.ReactNode {
  return (
    <React.Suspense fallback={<div>Loading (layout)...</div>}>
      <Toaster />
      {/* Mobile-only top bar: show a Menu icon to toggle the sidebar */}
      <header className="flex items-center gap-2 px-4 py-2 md:hidden">
        <SidebarTrigger icon={<Menu11Icon />} />
      </header>
      <AgentsInterface />
    </React.Suspense>
  );
}
