/**
 * Composio App Connector Button - for selecting apps in chat composer
 */
"use client";

import React, { useState } from "react";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useConnectedApps } from "@/lib/composio";
import { useComposioToolkitIcon } from "@/lib/composio/hooks";
import { ComposioManagerDialog } from "./composio-manager-dialog";
import { cn } from "@/lib/utils";

// Icon for Composio button (puzzle piece / integration icon)
function ComposioIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2v6.5" />
      <path d="m15 9-3-3-3 3" />
      <path d="M12 22v-6.5" />
      <path d="m9 15 3 3 3-3" />
      <path d="M2 12h6.5" />
      <path d="m9 9-3-3-3 3" />
      <path d="M22 12h-6.5" />
      <path d="m15 15 3 3 3-3" />
    </svg>
  );
}

// Component to display app icon
function AppIcon({ appSlug, appName }: { appSlug: string; appName: string }) {
  const { data: iconData } = useComposioToolkitIcon(appSlug);

  return (
    <div data-radius="radius1" className="border-border/50 bg-muted flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden border">
      {iconData?.icon_url ? (
        <img
          src={iconData.icon_url}
          alt={`${appName} logo`}
          className="h-full w-full object-contain p-1"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            // Hide image on error and show fallback
            img.style.display = "none";
            const parent = img.parentElement;
            if (parent) {
              const fallback = document.createElement("div");
              fallback.className =
                "flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm";
              fallback.textContent = appName.charAt(0).toUpperCase();
              parent.appendChild(fallback);
            }
          }}
        />
      ) : (
        <div className="from-primary/20 to-primary/10 text-primary flex h-full w-full items-center justify-center bg-gradient-to-br text-sm font-semibold">
          {appName.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

interface ComposioAppSelectorProps {
  selectedProfileIds: string[];
  onSelectionChange: (profileIds: string[]) => void;
  className?: string;
  /**
   * Display mode:
   * - 'button': Show as icon button (default)
   * - 'badges': Show selected apps as badges
   */
  displayMode?: "button" | "badges";
}

export function ComposioAppSelector({
  selectedProfileIds,
  onSelectionChange,
  className,
  displayMode = "button",
}: ComposioAppSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const { apps, isLoading } = useConnectedApps();

  const toggleApp = (profileId: string) => {
    if (selectedProfileIds.includes(profileId)) {
      onSelectionChange(selectedProfileIds.filter((id) => id !== profileId));
    } else {
      onSelectionChange([...selectedProfileIds, profileId]);
    }
  };

  const hasConnectedApps = apps.length > 0;
  const selectedCount = selectedProfileIds.length;
  const selectedApps = apps.filter((app) =>
    selectedProfileIds.includes(app.id),
  );

  // Badges display mode - show selected apps as removable badges
  if (displayMode === "badges" && selectedCount > 0) {
    return (
      <>
        <div className={cn("flex flex-wrap items-center gap-2", className)}>
          {selectedApps.map((app) => (
            <div
              key={app.id}
              data-radius="radius1"
              className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 flex items-center gap-2 border px-3 py-1.5 text-sm transition-colors"
            >
              <AppIcon
                appSlug={app.app_name}
                appName={app.app_name}
              />
              <span className="font-medium capitalize">{app.app_name}</span>
              <button
                type="button"
                onClick={() => toggleApp(app.id)}
                data-radius="radius1"
                className="hover:bg-primary/30 ml-1 p-0.5 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line
                    x1="18"
                    y1="6"
                    x2="6"
                    y2="18"
                  ></line>
                  <line
                    x1="6"
                    y1="6"
                    x2="18"
                    y2="18"
                  ></line>
                </svg>
              </button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(true)}
            className="text-muted-foreground hover:text-foreground h-8 text-xs"
            type="button"
          >
            + Add more
          </Button>
        </div>

        {/* Hidden popover for managing selection */}
        <Popover
          open={open}
          onOpenChange={setOpen}
        >
          <PopoverTrigger asChild>
            <div className="hidden" />
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-0"
            align="start"
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Connected Apps</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setOpen(false);
                    setShowConnectDialog(true);
                  }}
                >
                  + Add
                </Button>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Select apps to use in this conversation
              </p>
            </div>

            <Separator />

            {isLoading ? (
              <div className="space-y-3 p-4">
                <Skeleton
                  className="h-16 w-full"
                  data-radius="radius2"
                />
                <Skeleton
                  className="h-16 w-full"
                  data-radius="radius2"
                />
                <Skeleton
                  className="h-16 w-full"
                  data-radius="radius2"
                />
              </div>
            ) : !hasConnectedApps ? (
              <div className="p-4 text-center">
                <p className="text-muted-foreground mb-3 text-sm">
                  No apps connected yet
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    setShowConnectDialog(true);
                  }}
                >
                  Connect your first app
                </Button>
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="p-2">
                  {apps.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => toggleApp(app.id)}
                      data-radius="radius1"
                      className={cn(
                        "hover:bg-accent flex w-full items-start gap-3 p-3 text-left transition-colors",
                        selectedProfileIds.includes(app.id) && "bg-accent",
                      )}
                    >
                      <AppIcon
                        appSlug={app.app_name}
                        appName={app.app_name}
                      />
                      <Checkbox
                        checked={selectedProfileIds.includes(app.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {app.app_name}
                          </p>
                          <Badge
                            variant="secondary"
                            className="px-1.5 py-0 text-[10px]"
                          >
                            {app.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Connected{" "}
                          {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}

            {hasConnectedApps && (
              <>
                <Separator />
                <div className="p-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      setOpen(false);
                      setShowConnectDialog(true);
                    }}
                  >
                    Manage connections
                  </Button>
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>

        <ComposioManagerDialog
          open={showConnectDialog}
          onOpenChange={setShowConnectDialog}
        />
      </>
    );
  }

  // Button display mode (default)
  return (
    <>
      <Popover
        open={open}
        onOpenChange={setOpen}
      >
        <PopoverTrigger asChild>
          <div className="relative">
            <TooltipIconButton
              tooltip="Connect apps"
              aria-label="Connect apps"
              type="button"
              className={className}
            >
              <ComposioIcon />
            </TooltipIconButton>
            {selectedCount > 0 && (
              <Badge
                variant="default"
                className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]"
              >
                {selectedCount}
              </Badge>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-0"
          align="start"
        >
          <div className="p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Connected Apps</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  setShowConnectDialog(true);
                }}
              >
                + Add
              </Button>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Select apps to use in this conversation
            </p>
          </div>

          <Separator />

          {isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton
                className="h-16 w-full"
                data-radius="radius2"
              />
              <Skeleton
                className="h-16 w-full"
                data-radius="radius2"
              />
              <Skeleton
                className="h-16 w-full"
                data-radius="radius2"
              />
            </div>
          ) : !hasConnectedApps ? (
            <div className="p-4 text-center">
              <p className="text-muted-foreground mb-3 text-sm">
                No apps connected yet
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setShowConnectDialog(true);
                }}
              >
                Connect your first app
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="p-2">
                {apps.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => toggleApp(app.id)}
                    className={cn(
                      "hover:bg-accent flex w-full items-start gap-3 p-3 text-left transition-colors",
                      selectedProfileIds.includes(app.id) && "bg-accent",
                    )}
                    data-radius="radius2"
                  >
                    <AppIcon
                      appSlug={app.app_name}
                      appName={app.app_name}
                    />
                    <Checkbox
                      checked={selectedProfileIds.includes(app.id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {app.app_name}
                        </p>
                        <Badge
                          variant="secondary"
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {app.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        Connected{" "}
                        {new Date(app.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {hasConnectedApps && (
            <>
              <Separator />
              <div className="p-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start text-xs"
                  onClick={() => {
                    setOpen(false);
                    setShowConnectDialog(true);
                  }}
                >
                  Manage connections
                </Button>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      <ComposioManagerDialog
        open={showConnectDialog}
        onOpenChange={setShowConnectDialog}
      />
    </>
  );
}
