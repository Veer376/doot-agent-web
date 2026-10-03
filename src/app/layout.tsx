import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { roobert } from "./fonts/roobert";
import { roobertMono } from "./fonts/roobert-mono";
import { AppProviders } from "@/providers";

export const metadata: Metadata = {
  title: "DootAgent",
  description: "Local DootAgent interface",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="black-white"
      className={`${roobert.variable} ${roobertMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className={roobert.className}
        suppressHydrationWarning
      >
        <AppProviders>
          <main>{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
