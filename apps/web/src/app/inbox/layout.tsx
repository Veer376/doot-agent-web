import type { Metadata } from "next";
import "@/app/globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ThreadsProvider } from "@/components/agent-inbox/contexts/ThreadContext";
import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { InboxSidebar, InboxSidebarTrigger } from "@/components/inbox-sidebar";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  preload: true,
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agent Inbox",
  description: "Agent Inbox UX by LangChain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <body className={inter.className}>
        <React.Suspense fallback={<div>Loading (layout)...</div>}>
          <Toaster />
          <ThreadsProvider>
            <div className="flex flex-row w-full min-h-full">
              {/* Main content area, including left sidebar (handled by main app layout) */}
              <main className="flex flex-row w-full min-h-full pt-6 pl-6 pr-6 gap-6">
                <div className="flex flex-col gap-6 w-full min-h-full">
                  <div
                    className={cn(
                      "h-full bg-white rounded-tl-[58px]",
                      "overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                    )}
                  >
                    {children}
                  </div>
                </div>
                
                {/* Right sidebar for inbox */}
                <SidebarProvider>
                  <InboxSidebar />
                  <InboxSidebarTrigger isOutside={true} />
                </SidebarProvider>
              </main>
            </div>
          </ThreadsProvider>
        </React.Suspense>
      </body>
  );
}
