"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { AgentsProvider } from "@/providers/Agents";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AgentsProvider>
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </AgentsProvider>
    </SidebarProvider>
  );
}
