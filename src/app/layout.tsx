import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { roobert } from "./fonts/roobert";
import { roobertMono } from "./fonts/roobert-mono";
import { ThemeProvider } from "@/providers/Theme";

export const metadata: Metadata = {
  title: "DootAgent",
  description: "Handoff complexity to DootAgent",
  icons: {
    icon: [
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/icon-dark.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
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
      <body
        className={roobert.className}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
