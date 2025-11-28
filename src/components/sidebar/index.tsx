"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { MCPProvider } from "@/providers/MCP";
import { useAuthContext } from "@/providers/Auth";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthContext();

  return (
    <SidebarProvider>
      <MCPProvider>
        {/* Conditionally render sidebar only when authenticated */}
        {isAuthenticated && <AppSidebar />}
        <SidebarInset>{children}</SidebarInset>
      </MCPProvider>
    </SidebarProvider>
  );
}
