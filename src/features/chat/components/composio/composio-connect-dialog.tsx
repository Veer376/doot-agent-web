/**
 * Composio Connect Dialog - for connecting new apps via OAuth
 */
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  useComposioApps,
  useConnectedAccounts,
  useCreateConnection,
  useDisconnectAccount,
} from "@/lib/composio";
import { Loader2, ExternalLink, Trash2 } from "lucide-react";

interface ComposioConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComposioConnectDialog({
  open,
  onOpenChange,
}: ComposioConnectDialogProps) {
  const [step, setStep] = useState<"select" | "connecting" | "success">(
    "select",
  );
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  const { data: apps, isLoading: appsLoading } = useComposioApps();
  const { data: accounts } = useConnectedAccounts();
  const createConnection = useCreateConnection();
  const disconnectAccount = useDisconnectAccount();

  const handleAppSelect = async (appSlug: string) => {
    setStep("connecting");

    try {
      const result = await createConnection.mutateAsync(appSlug);

      if (result.redirect_url) {
        setRedirectUrl(result.redirect_url);
        // Open OAuth in new window
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        window.open(
          result.redirect_url,
          "composio-oauth",
          `width=${width},height=${height},left=${left},top=${top}`,
        );

        setStep("success");
      } else {
        // No OAuth needed
        setStep("success");
      }
    } catch (error) {
      console.error("Failed to create connection:", error);
      setStep("select");
    }
  };

  const handleClose = () => {
    setStep("select");
    setRedirectUrl(null);
    onOpenChange(false);
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      await disconnectAccount.mutateAsync(accountId);
    } catch (error) {
      console.error("Failed to disconnect account:", error);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {step === "select" && "Connect an App"}
            {step === "connecting" && "Connecting..."}
            {step === "success" && "Connection Initiated"}
          </DialogTitle>
          <DialogDescription>
            {step === "select" &&
              "Choose an app to connect to your conversations"}
            {step === "connecting" && "Setting up your connection..."}
            {step === "success" &&
              "Complete the OAuth flow in the popup window"}
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4">
            {/* Connected Accounts Section */}
            {accounts && accounts.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium">
                  Your Connected Accounts
                </h3>
                <ScrollArea data-radius="radius1" className="h-[150px] border p-2">
                  <div className="space-y-2">
                    {accounts.map((account) => (
                      <div
                        key={account.id}
                        data-radius="radius1"
                        className="hover:bg-accent flex items-center justify-between p-2"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {account.app_name}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="text-xs"
                            >
                              {account.app_name}
                            </Badge>
                            <Badge
                              variant={
                                account.status === "active"
                                  ? "default"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              {account.status || "connected"}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDisconnect(account.id)}
                          disabled={disconnectAccount.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Available Apps */}
            <div>
              <h3 className="mb-2 text-sm font-medium">Available Apps</h3>
              {appsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <ScrollArea data-radius="radius1" className="h-[300px] border p-2">
                  <div className="grid grid-cols-2 gap-2">
                    {apps?.slice(0, 20).map((app) => (
                      <button
                        key={app.key}
                        onClick={() => handleAppSelect(app.key)}
                        data-radius="radius1"
                        className="hover:bg-accent flex flex-col items-start gap-2 border p-3 text-left transition-colors"
                      >
                        <div data-radius="radius1" className="bg-primary/10 flex h-10 w-10 items-center justify-center">
                          {app.logo ? (
                            <img
                              src={app.logo}
                              alt={app.name}
                              className="h-6 w-6"
                            />
                          ) : (
                            <span className="text-lg font-bold">
                              {app.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{app.name}</p>
                          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                            {app.description || "No description available"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}

        {step === "connecting" && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="mb-4 h-12 w-12 animate-spin" />
            <p className="text-muted-foreground text-sm">
              Setting up your connection...
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4">
            <div data-radius="radius2" className="border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
              <p className="text-sm">✅ Connection initiated successfully!</p>
              {redirectUrl && (
                <div className="mt-3">
                  <p className="text-muted-foreground mb-2 text-sm">
                    Complete the authentication in the popup window. If it
                    didn't open:
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(redirectUrl, "composio-oauth")}
                    className="w-full"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Authentication Window
                  </Button>
                </div>
              )}
            </div>
            <Button
              onClick={handleClose}
              className="w-full"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
