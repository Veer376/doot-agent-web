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
          <div className="flex min-h-full w-full flex-row">
            {/* Main content area */}
            <div className="flex-grow pt-6 pl-6">
              <div
                className={cn(
                  "h-full rounded-tl-[58px] bg-white",
                  "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 overflow-x-auto",
                )}
              >
                {children}
              </div>
            </div>

            {/* Right sidebar for inbox - width auto prevents it from taking extra space */}
            <div className="flex-none">
              <SidebarProvider style={{ width: "auto" }}>
                <InboxSidebar />
                <InboxSidebarTrigger isOutside={true} />
              </SidebarProvider>
            </div>
          </div>
        </ThreadsProvider>
      </React.Suspense>
    </body>
  );
}
