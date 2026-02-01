import { Toaster } from "@/components/ui/sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Menu11Icon } from "@/components/icons";
import { useAuthSession } from "@/providers/Auth";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { AuthDialog, type AuthMode } from "@/components/auth/auth-dialog";
import { useNavigate, useSearchParams } from "react-router-dom";
import React from "react";
import { AgentTour } from "@/features/tour/components/AgentTour";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import ChatInterface from "@/features/chat";

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("auth");
      setSearchParams(newParams, { replace: true });
    }
  }, [isAuthenticated, searchParams, setSearchParams]);

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
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <ChatInterface />
      </div>

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
