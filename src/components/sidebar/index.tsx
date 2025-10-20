"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { MCPProvider } from "@/providers/MCP";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <MCPProvider>
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </MCPProvider>
    </SidebarProvider>
  );
}
