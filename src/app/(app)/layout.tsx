import type { Metadata } from "next";
import "../globals.css";
import React from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { SidebarLayout } from "@/components/sidebar";
import { ActiveRunsProvider } from "@/providers/ActiveRuns";

export const metadata: Metadata = {
  title: "DootAgent",
  description: "Local DootAgent interface",
};

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <NuqsAdapter>
      <ActiveRunsProvider>
        <SidebarLayout>{children}</SidebarLayout>
      </ActiveRunsProvider>
    </NuqsAdapter>
  );
}
