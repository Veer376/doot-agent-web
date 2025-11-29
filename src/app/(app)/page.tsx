"use client";

import ChatInterface from "@/features/chat";
import { Toaster } from "@/components/ui/sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Menu11Icon, DootIcon } from "@/components/icons";
import { useAuthContext } from "@/providers/Auth";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { AuthDialog, type AuthMode } from "@/components/auth/auth-dialog";
import { useRouter } from "next/navigation";
import React from "react";

/**
 * The default page (/).
 * Contains the generic chat interface.
 */
export default function ChatPage(): React.ReactNode {
  const { isAuthenticated } = useAuthContext();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const router = useRouter();

  // Handle auth query param to open dialog (e.g., /?auth=signin)
  useEffect(() => {
    // Read search params from `window.location` inside the client-only effect
    // This avoids using `useSearchParams()` which can cause a CSR bailout during pre-render.
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const authParam = params.get("auth");
    if (!isAuthenticated && authParam) {
      const validModes: AuthMode[] = ["signin", "signup", "forgot-password"];
      if (validModes.includes(authParam as AuthMode)) {
        setAuthMode(authParam as AuthMode);
        setAuthDialogOpen(true);
      }
      // Clean up the URL (remove auth param)
      router.replace("/", { scroll: false });
    } else if (!isAuthenticated && params.toString()) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);
  const handleOpenSignUp = () => {
    setAuthMode("signup");
    setAuthDialogOpen(true);
  };

  return (
    <React.Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center">
          <DootIcon
            className="animate-pulse"
            size={48}
          />
        </div>
      }
    >
      <Toaster />
      {/* Header: left (mobile-only) sidebar trigger + shared thread details area (all breakpoints) */}
      <header className="flex shrink-0 items-center gap-2 px-4 py-2 transition-[width,height] ease-linear">
        {/* Mobile-only: sidebar toggle (only show when authenticated) */}
        {isAuthenticated && (
          <div className="flex items-center gap-2 md:hidden">
            <SidebarTrigger icon={<Menu11Icon />} />
          </div>
        )}
        {/* Shared (mobile + desktop): thread details/title/actions placeholder */}
        <div className="flex min-w-0 flex-1 items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            {/* TODO(thread): avatar/badge/typing indicator slot */}
            <div className="text-foreground/90 truncate text-sm font-medium">
              {/* TODO(thread): thread title */}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 pr-4">
            {/* Show auth buttons when not authenticated */}
            {!isAuthenticated ? (
              <>
                <Button
                  size="sm"
                  onClick={handleOpenSignUp}
                >
                  Try Now!
                </Button>
              </>
            ) : (
              <>{/* TODO(thread): actions (mute, pin, more) */}</>
            )}
          </div>
        </div>
      </header>
      <ChatInterface />

      {/* Auth Dialog */}
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        mode={authMode}
      />
    </React.Suspense>
  );
}
