import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { roobert } from "./fonts/roobert";
import { roobertMono } from "./fonts/roobert-mono";
import { ThemeProvider } from "@/providers/Theme";

export const metadata: Metadata = {
  title: "Orbit Agent",
  description: "Handoff complexity to Orbit",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${roobert.variable} ${roobertMono.variable}`}
      suppressHydrationWarning
    >
      <body className={roobert.className} suppressHydrationWarning>
        <ThemeProvider>
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
