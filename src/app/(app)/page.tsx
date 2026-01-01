"use client";

import ChatInterface from "@/features/chat";
import { Toaster } from "@/components/ui/sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Menu11Icon, GithubIcon } from "@/components/icons";
import { useAuthSession } from "@/providers/Auth";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { AuthDialog, type AuthMode } from "@/components/auth/auth-dialog";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { AgentTour } from "@/features/tour/components/AgentTour";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";

/**
 * The default page (/).
 * Contains the generic chat interface.
 */
export default function ChatPage(): React.ReactNode {
  const { isAuthenticated, isLoading } = useAuthSession();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [welcomeDone, setWelcomeDone] = useState(() => {
    // Check if welcome was already seen on initial render
    if (typeof window !== "undefined") {
      return localStorage.getItem("dootagent-demo-seen") === "true";
    }
    return false;
  });
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle auth query param to open dialog (e.g., /?auth=signin)
  // Uses useSearchParams to react to client-side URL changes
  useEffect(() => {
    const authParam = searchParams.get("auth");

    if (!isAuthenticated && authParam) {
      const validModes: AuthMode[] = ["signin", "signup", "forgot-password"];
      if (validModes.includes(authParam as AuthMode)) {
        setAuthMode(authParam as AuthMode);
        setAuthDialogOpen(true);
      }

      // Remove ONLY the auth param, preserve all other params (threadId, etc.)
      const params = new URLSearchParams(searchParams.toString());
      params.delete("auth");
      const newUrl = params.toString() ? `/?${params.toString()}` : "/";
      router.replace(newUrl, { scroll: false });
    }
  }, [isAuthenticated, searchParams, router]);

  const handleOpenSignUp = () => {
    setAuthMode("signup");
    setAuthDialogOpen(true);
  };

  const handleWelcomeClose = () => {
    setWelcomeDone(true);
  };

  return (
    <>
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
            {/* GitHub link - always visible */}
            <a
              href="https://github.com/Veer376/doot-agent-lab"
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
              title="View on GitHub"
            >
              <GithubIcon className="size-5" />
            </a>
            {/* Show auth buttons when not authenticated */}
            {!isAuthenticated && !isLoading ? (
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

      {/* Welcome video modal - shows first */}
      <WelcomeModal onClose={handleWelcomeClose} />

      {/* Tour for unauthenticated users - only after welcome is done */}
      {welcomeDone && <AgentTour />}
    </>
  );
}
