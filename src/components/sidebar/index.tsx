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
      <SidebarInset>
        {/* Mobile-only floating hamburger — always visible outside the drawer */}
        <div className="fixed left-3 top-3 z-50 md:hidden">
          <SidebarTrigger
            icon={<Menu11Icon size={18} />}
            className="bg-background/80 size-8 rounded-full shadow-sm backdrop-blur-sm"
          />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
