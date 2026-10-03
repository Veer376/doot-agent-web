"use client";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Menu11Icon } from "@/components/icons";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="doot-shell">
        {/* Mobile-only floating hamburger — always visible outside the drawer */}
        <div className="absolute top-3 left-3 z-30 md:hidden">
          <SidebarTrigger
            icon={<Menu11Icon size={18} />}
            className="bg-background size-8 rounded-lg"
          />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
