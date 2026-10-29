"use client";

import AgentsInterface from "@/features/agents";
import { Toaster } from "@/components/ui/sonner";
import { DootLogoIcon } from "@/components/icons";
import React from "react";

/**
 * The /agents page.
 * Contains the list of all agents the user has access to.
 */
export default function AgentsPage(): React.ReactNode {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center">
          <DootLogoIcon
            className="animate-pulse"
            size={48}
          />
        </div>
      }
    >
      <Toaster />
      <AgentsInterface />
    </React.Suspense>
  );
}
