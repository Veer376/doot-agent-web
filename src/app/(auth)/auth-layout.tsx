"use client";

import React from "react";
import { useAuthSession } from "@/providers/Auth";
import { Skeleton } from "@/components/ui/skeleton";

// Layout component for pages that don't need the sidebar (auth pages)
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isLoading } = useAuthSession();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Generic auth page skeleton - page-specific loading.tsx files provide better UX */}
          <div className="mb-10 flex flex-col items-center justify-center gap-3 sm:gap-4">
            <Skeleton
              className="h-8 w-64"
              data-radius="surface"
            />
          </div>

          <div className="space-y-3">
            <Skeleton
              className="h-11 w-full"
              data-radius="surface"
            />
            <Skeleton
              className="h-11 w-full"
              data-radius="surface"
            />

            <div className="pt-2">
              <Skeleton
                className="h-10 w-full"
                data-radius="surface"
              />
            </div>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
          </div>

          <Skeleton
            className="h-12 w-full"
            data-radius="surface"
          />

          <div className="mt-6 flex justify-center gap-1">
            <Skeleton
              className="h-5 w-32"
              data-radius="surface"
            />
          </div>
        </div>
      </div>
    );
  }

  return children;
}
