"use client";

import ChatInterface from "@/features/chat";
import { Toaster } from "@/components/ui/sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Menu11Icon } from "@/components/icons";
import React from "react";

/**
 * The default page (/).
 * Contains the generic chat interface.
 */
export default function ChatPage(): React.ReactNode {
  return (
    <React.Suspense fallback={<div>Loading (layout)...</div>}>
      <Toaster />
      {/* Header: left (mobile-only) sidebar trigger + shared thread details area (all breakpoints) */}
      <header className="flex shrink-0 items-center gap-2 px-4 py-2 transition-[width,height] ease-linear">
        {/* Mobile-only: sidebar toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <SidebarTrigger icon={<Menu11Icon />} />
        </div>
        {/* Shared (mobile + desktop): thread details/title/actions placeholder */}
        <div className="flex min-w-0 flex-1 items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            {/* TODO(thread): avatar/badge/typing indicator slot */}
            <div className="text-foreground/90 truncate text-sm font-medium">
              {/* TODO(thread): thread title */}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* TODO(thread): actions (mute, pin, more) */}
          </div>
        </div>
      </header>
      <ChatInterface />
    </React.Suspense>
  );
}
