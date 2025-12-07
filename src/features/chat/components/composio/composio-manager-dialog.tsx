/**
 * Composio Manager Dialog - Full-featured app connection management
 * Integrates the working test page functionality into the main app
 */
"use client";

import React, { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { composioAPI } from "@/lib/composio/api";
import { Loader2, Search, Trash2, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/providers/Auth";
import type { ComposioApp, ComposioAccount } from "@/types/composio";

interface ComposioManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComposioManagerDialog({
  open,
  onOpenChange,
}: ComposioManagerDialogProps) {
  const { user } = useAuthUser();
  const userId = user?.id || "anonymous";
  const [loading, setLoading] = useState(false);
  const [apps, setApps] = useState<ComposioApp[]>([]);
  const [accounts, setAccounts] = useState<ComposioAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  // Cleanup polling interval when component unmounts
  useEffect(() => {
    return () => {
      // Clear any active polling interval
      const pollInterval = (window as Window & { __composioPollingInterval?: NodeJS.Timeout }).__composioPollingInterval;
      if (pollInterval) {
        clearInterval(pollInterval);
        delete (window as Window & { __composioPollingInterval?: NodeJS.Timeout }).__composioPollingInterval;
      }
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appsData, accountsData] = await Promise.all([
        composioAPI.getApps(),
        composioAPI.getConnectedAccounts(userId),
      ]);
      setApps(appsData);
      setAccounts(accountsData);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load apps and connections");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (appSlug: string) => {
    setLoading(true);
    try {
      const result = await composioAPI.createConnection({
        user_id: userId,
        app_slug: appSlug,
      });

      if (result.redirect_url) {
        // Open OAuth in new window
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          result.redirect_url,
          "composio-oauth",
          `width=${width},height=${height},left=${left},top=${top}`,
        );

        if (popup) {
          toast.success(`Opening ${appSlug} connection...`);
          
          // Set up polling with proper cleanup
          let attempts = 0;
          const MAX_ATTEMPTS = 30; // 30 attempts × 2s = 60 seconds max
          
          const pollInterval = setInterval(async () => {
            attempts++;
            
            // Check if max attempts reached
            if (attempts > MAX_ATTEMPTS) {
              clearInterval(pollInterval);
              toast.warning(`Connection timeout. Please try again.`);
              loadData(); // Refresh to show any partial success
              return;
            }

            // Check if popup is closed first (avoid unnecessary API call)
            if (popup.closed) {
              clearInterval(pollInterval);
              loadData();
              return;
            }

            try {
              // Poll for connection status
              const updatedAccounts = await composioAPI.getConnectedAccounts(userId);
              setAccounts(updatedAccounts);
            } catch (error) {
              // Log error but continue polling (transient network issues)
              console.warn('Polling error:', error);
              // Only stop on popup close or max attempts
            }
          }, 2000);

          // Store interval ID so it can be cleared if dialog closes
          // This is handled by component unmount in the useEffect below
          (window as Window & { __composioPollingInterval?: NodeJS.Timeout }).__composioPollingInterval = pollInterval;
        } else {
          toast.error("Popup blocked. Please allow popups for this site.");
        }
      } else {
        toast.success(`Connected to ${appSlug}!`);
        loadData();
      }
    } catch (error) {
      console.error("Failed to connect:", error);
      toast.error(error instanceof Error ? error.message : "Failed to connect app");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (accountId: string, appName: string) => {
    try {
      await composioAPI.disconnectAccount(userId, accountId);
      toast.success(`Disconnected ${appName}`);
      loadData();
    } catch (error) {
      console.error("Failed to disconnect:", error);
      toast.error(error instanceof Error ? error.message : "Failed to disconnect");
    }
  };

  const filteredApps = apps.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const appProfileCounts = accounts.reduce(
    (acc, account) => {
      const appKey = account.app_name.toLowerCase();
      acc[appKey] = (acc[appKey] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="flex h-[90vh] max-h-[90vh] flex-col p-0 sm:max-w-[900px]">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>App Connections</DialogTitle>
          <DialogDescription>
            Connect and manage your OAuth integrations
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="available"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <TabsList className="mx-6 grid w-full flex-shrink-0 grid-cols-2">
            <TabsTrigger value="connected">
              Connected ({accounts.length})
            </TabsTrigger>
            <TabsTrigger value="available">
              Available ({apps.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="connected"
            className="m-0 flex flex-1 flex-col overflow-hidden pb-6 data-[state=active]:flex"
          >
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground text-sm">
                  No apps connected yet
                </p>
                <Button
                  variant="link"
                  onClick={() => {
                    const trigger = document.querySelector(
                      '[data-state][value="available"]',
                    );
                    if (trigger instanceof HTMLElement) {
                      trigger.click();
                    }
                  }}
                >
                  Browse available apps
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-full px-6">
                <div className="space-y-2 pr-4">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      data-radius="radius1"
                      className="hover:bg-accent/50 flex items-center justify-between border p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium capitalize">
                            {account.app_name}
                          </h4>
                          {account.label && (
                            <span className="text-muted-foreground text-sm">
                              ({account.label})
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge
                            variant={
                              account.status === "ACTIVE"
                                ? "default"
                                : "secondary"
                            }
                            className="flex items-center gap-1"
                          >
                            {account.status === "ACTIVE" ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {account.status}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {account.id}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleDisconnect(account.id, account.app_name)
                        }
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent
            value="available"
            className="m-0 flex flex-1 flex-col overflow-hidden pb-6 data-[state=active]:flex"
          >
            <div className="relative mb-4 flex-shrink-0 px-6">
              <Search className="text-muted-foreground absolute top-1/2 left-9 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="flex min-h-[400px] items-center justify-center py-8">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-full px-6">
                <div className="grid grid-cols-1 gap-3 pr-4 sm:grid-cols-3">
                  {filteredApps.map((app) => {
                    const appKey = app.key.toLowerCase();
                    const profileCount = appProfileCounts[appKey] || 0;
                    const isConnected = profileCount > 0;

                    return (
                      <div
                        key={app.key}
                        className="group border-border bg-card hover:shadow-primary/5 relative overflow-hidden rounded-2xl border transition-all hover:shadow-md"
                      >
                        <div className="p-4">
                          <div className="mb-3 flex items-center gap-3">
                            <div className="bg-muted border-border/50 relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border">
                              {app.logo ? (
                                <img
                                  src={app.logo}
                                  alt={`${app.name} logo`}
                                  className="h-full w-full object-contain p-1.5"
                                  loading="lazy"
                                  onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    // Try Composio CDN fallback
                                    if (!img.src.includes("img.composio.dev")) {
                                      img.src = `https://img.composio.dev/app/${app.key}/logo`;
                                    } else {
                                      // Show fallback div if CDN also fails
                                      const parent = img.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<div class="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-lg">${app.name.charAt(0).toUpperCase()}</div>`;
                                      }
                                    }
                                  }}
                                />
                              ) : (
                                <div className="from-primary/20 to-primary/10 text-primary flex h-full w-full items-center justify-center bg-gradient-to-br text-lg font-semibold">
                                  {app.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-foreground mb-0.5 truncate text-base font-semibold">
                                {app.name}
                              </h3>
                              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                                <span className="truncate">by Composio</span>
                                {isConnected && (
                                  <Badge
                                    variant="secondary"
                                    className="border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-900/20 dark:text-green-400"
                                  >
                                    {profileCount}{" "}
                                    {profileCount === 1
                                      ? "profile"
                                      : "profiles"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mb-3">
                            <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                              {app.description ||
                                `Connect to ${app.name} and access its tools and capabilities.`}
                            </p>
                          </div>

                          <div className="flex items-center justify-between">
                            {isConnected ? (
                              <Button
                                onClick={() => {
                                  const trigger = document.querySelector(
                                    '[data-state][value="connected"]',
                                  );
                                  if (trigger instanceof HTMLElement) {
                                    trigger.click();
                                  }
                                }}
                                className="bg-foreground hover:bg-foreground/90 text-background w-full"
                                size="sm"
                              >
                                Manage Connection
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleConnect(app.key)}
                                disabled={loading}
                                className="bg-foreground hover:bg-foreground/90 text-background w-full"
                                size="sm"
                              >
                                Connect
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
