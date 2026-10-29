"use client";

import Settings from "@/features/settings";
import { Toaster } from "@/components/ui/sonner";
import { DootLogoIcon } from "@/components/icons";
import React from "react";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

/**
 * The /settings page.
 * Contains the settings interface for managing API keys and other user preferences.
 */
export default function SettingsPage(): React.ReactNode {
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
      <Settings />
    </React.Suspense>
  );
}
