"use client";

import React, { useState } from "react";
import {
  CheckmarkCircle02Icon,
  Download01Icon,
  Loading03Icon,
} from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useActivateMCPServer,
  useDeactivateMCPServer,
  useConnectMCPServer,
} from "@/hooks/use-local-mcp";
import type { MCPServerInstance, MCPTool } from "@/types/mcp";
import { cn } from "@/lib/utils";

interface MCPServerCardProps {
  server: MCPServerInstance;
  variant: "installed" | "available";
  onInstall?: () => void;
  isInstalling?: boolean;
}

export function MCPServerCard({
  server,
  variant,
  onInstall,
  isInstalling,
}: MCPServerCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [toolsDialogOpen, setToolsDialogOpen] = useState(false);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const activateMutation = useActivateMCPServer();
  const deactivateMutation = useDeactivateMCPServer();
  const connectMutation = useConnectMCPServer();

  // Activation = user preference to use this server
  const isActivated = server.status === "ACTIVATED" || server.status === "CONNECTED";
  // Connection = actively connected with tools available
  const isConnected = server.status === "CONNECTED";
  
  const isPending = activateMutation.isPending || deactivateMutation.isPending;

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      await activateMutation.mutateAsync(server.id);
    } else {
      await deactivateMutation.mutateAsync(server.id);
    }
  };

  const handleCardClick = async () => {
    // Only allow clicking if server is activated
    if (!isActivated) return;
    
    setToolsDialogOpen(true);
    setConnectionError(null);
    
    // If already connected with tools, just show them
    if (isConnected && tools.length > 0) {
      return;
    }
    
    // Connect and fetch tools
    setIsConnecting(true);
    try {
      const result = await connectMutation.mutateAsync(server.id);
      setTools(result.tools);
    } catch (error) {
      console.error("[MCP] Failed to connect:", error);
      setConnectionError(error instanceof Error ? error.message : "Failed to connect");
    } finally {
      setIsConnecting(false);
    }
  };

  // Available variant with download progress
  if (variant === "available") {
    return (
      <div className="flex flex-col p-3 border bg-card" data-radius="radius2">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{server.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {server.description}
            </div>
          </div>
          <Button
            size="sm"
            onClick={onInstall}
            disabled={isInstalling}
            className="shrink-0 ml-3"
          >
            {isInstalling ? (
              <>
                <Download01Icon className="size-4 mr-1.5 animate-pulse" />
                Installing...
              </>
            ) : (
              "Install"
            )}
          </Button>
        </div>
        {/* Progress bar when installing */}
        {isInstalling && (
          <div className="mt-3">
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Downloading package...
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "p-3 border bg-card transition-all",
          isActivated && "cursor-pointer",
          isHovered && isActivated && "bg-accent/50 border-accent"
        )}
        data-radius="radius2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{server.name}</span>
              
              {/* Status badge */}
              {!isActivated ? (
                <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 bg-muted/30">
                  Inactive
                </Badge>
              ) : isConnected ? (
                <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-50 dark:bg-green-950/30">
                  <CheckmarkCircle02Icon className="size-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                  Connect
                </Badge>
              )}
              
              {/* Tool count */}
              {isConnected && tools.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({tools.length} tools)
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {server.description}
            </div>
          </div>

          <div 
            className="flex items-center gap-2 shrink-0 ml-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Activation toggle switch */}
            <Switch
              checked={isActivated}
              onCheckedChange={handleToggle}
              disabled={isPending}
            />
          </div>
        </div>
      </div>

      {/* Tools Dialog */}
      <Dialog open={toolsDialogOpen} onOpenChange={setToolsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[70vh]" data-radius="radius2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {server.name}
              {isConnecting ? (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600/30 bg-yellow-50 dark:bg-yellow-950/30">
                  <Loading03Icon className="size-3 mr-1 animate-spin" />
                  Connecting...
                </Badge>
              ) : isConnected ? (
                <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-50 dark:bg-green-950/30">
                  <CheckmarkCircle02Icon className="size-3 mr-1" />
                  Connected
                </Badge>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              {isConnecting 
                ? "Establishing connection to MCP server..."
                : "Available tools from this MCP server"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[50vh]">
            {isConnecting ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loading03Icon className="size-8 animate-spin mb-3" />
                <p className="text-sm">Connecting to {server.name}...</p>
              </div>
            ) : connectionError ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-red-600 mb-2">Connection failed</p>
                <p className="text-xs text-muted-foreground">{connectionError}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => handleCardClick()}
                >
                  Retry
                </Button>
              </div>
            ) : tools.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                No tools available
              </div>
            ) : (
              <div className="space-y-2">
                {tools.map((tool) => (
                  <div
                    key={tool.name}
                    className="p-3 border bg-muted/30"
                    data-radius="radius1"
                  >
                    <div className="font-medium text-sm">{tool.name}</div>
                    {tool.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {tool.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
