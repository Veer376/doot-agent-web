"use client";

import ChatInterface from "@/features/chat";
import { Toaster } from "@/components/ui/sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Menu11Icon, DootIcon } from "@/components/icons";
import { useAuthContext } from "@/providers/Auth";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AuthDialog } from "@/components/auth/auth-dialog";
import React from "react";

/**
 * The default page (/).
 * Contains the generic chat interface.
 */
export default function ChatPage(): React.ReactNode {
  const { isAuthenticated } = useAuthContext();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const handleOpenSignIn = () => {
    setAuthMode("signin");
    setAuthDialogOpen(true);
  };

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
          <div className="flex items-center gap-2">
            {/* Show auth buttons when not authenticated */}
            {!isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenSignIn}
                >
                  Log In
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenSignUp}
                >
                  Sign Up
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
