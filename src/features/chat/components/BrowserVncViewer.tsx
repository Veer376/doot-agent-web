"use client";

import { useState } from "react";
import { Loader2, RefreshCw, AlertCircle, Monitor } from "lucide-react";
import { useVncConnection } from "@/hooks/use-vnc-connection";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BrowserVncViewerProps {
  className?: string;
  enabled?: boolean;
}

/**
 * Interactive browser VNC viewer component.
 * Displays a real-time, interactive browser session via noVNC.
 * Based on Suna's HealthCheckedVncIframe implementation.
 */
export function BrowserVncViewer({ className, enabled = true }: BrowserVncViewerProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const { status, error, retry, isReady, vncUrl } = useVncConnection({
    maxRetries: 5,
    initialDelay: 1000,
    timeoutMs: 5000,
    enabled,
  });

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
    retry();
  };

  // Loading state
  if (status === "idle" || status === "connecting" || status === "preloading") {
    return (
      <div
        data-radius="radius2"
        className={cn(
          "bg-muted/30 flex flex-col items-center justify-center gap-3 border p-8",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          <span className="text-muted-foreground text-sm font-medium">
            {status === "connecting" ? "Connecting to browser..." : "Initializing VNC..."}
          </span>
        </div>
        <div className="text-muted-foreground/60 text-xs">
          This may take a few moments
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div
        data-radius="radius2"
        className={cn(
          "bg-muted/30 flex flex-col items-center justify-center gap-4 border p-8",
          className
        )}
      >
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Failed to connect to browser</span>
        </div>
        {error && (
          <div className="bg-destructive/10 text-destructive max-w-md rounded border border-destructive/20 px-3 py-2 text-xs">
            {error}
          </div>
        )}
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry Connection
        </Button>
      </div>
    );
  }

  // Ready state - show VNC viewer
  if (isReady && vncUrl) {
    return (
      <div
        data-radius="radius2"
        className={cn("bg-muted/30 relative overflow-hidden border", className)}
      >
        {/* Header with status indicator */}
        <div className="flex items-center justify-between border-b bg-background/50 px-4 py-2">
          <div className="flex items-center gap-2">
            <Monitor className="text-muted-foreground h-4 w-4" />
            <span className="text-xs font-medium">Live Browser Control</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-muted-foreground text-xs">Connected</span>
            </div>
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              title="Refresh connection"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* VNC iframe - full interactive control */}
        <div className="relative aspect-[4/3] w-full">
          <iframe
            key={iframeKey}
            src={vncUrl}
            title="Browser VNC Viewer"
            className="absolute inset-0 h-full w-full border-0"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-pointer-lock allow-downloads"
          />
        </div>

        {/* Help text */}
        <div className="border-t bg-background/50 px-4 py-2">
          <p className="text-muted-foreground text-xs">
            Click and interact directly with the browser. 
            Changes will be reflected in the agent's view.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
