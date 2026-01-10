import type { Metadata } from "next";
import "../globals.css";
import React from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { SidebarLayout } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "Doot Agent",
  description: "Handoff complexity to Doot",
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
      <SidebarLayout>{children}</SidebarLayout>
    </NuqsAdapter>
  );
}
