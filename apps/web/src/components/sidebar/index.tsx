"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { AgentsProvider } from "@/providers/Agents";
import { MCPProvider } from "@/providers/MCP";
import { RagProvider } from "@/features/rag/providers/RAG";
import { BlueprintsProvider } from "@/providers/Blueprints";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <MCPProvider>
        <BlueprintsProvider>
          <AgentsProvider>
            <RagProvider>
              <AppSidebar />
              <SidebarInset>{children}</SidebarInset>
            </RagProvider>
          </AgentsProvider>
        </BlueprintsProvider>
      </MCPProvider>
    </SidebarProvider>
  );
}
