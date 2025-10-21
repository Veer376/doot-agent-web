import type { Metadata } from "next";
import "../globals.css";
import React from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { SidebarLayout } from "@/components/sidebar";
import { AuthProvider } from "@/providers/Auth";
import { ReactQueryProvider } from "@/providers/QueryClient";

export const metadata: Metadata = {
  title: "Orbit Agent",
  description: "Handoff complexity to Orbit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // <html lang="en">
    //   <body className={inter.className}>
    //     {isDemoApp && (
    //       <div className="bg-brand-accent-light text-foreground fixed top-0 right-0 left-0 z-10 py-2 text-center shadow-md">
    //         You're currently using the demo application. To use your own agents,
    //         and run in production, check out the{" "}
    //         <a
    //           className="underline underline-offset-2"
    //           href={DOCS_LINK}
    //           target="_blank"
    //           rel="noopener noreferrer"
    //         >
    //           documentation
    //         </a>
    //       </div>
    //     )}
    <NuqsAdapter>
      <AuthProvider>
        <ReactQueryProvider>
          <SidebarLayout>{children}</SidebarLayout>
        </ReactQueryProvider>
      </AuthProvider>
    </NuqsAdapter>
    //   </body>
    // </html>
  );
}
