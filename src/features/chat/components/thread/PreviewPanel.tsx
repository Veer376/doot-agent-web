"use client";

import { useState } from "react";
import { useStreamContext } from "@/features/chat/providers/Stream";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, Monitor, Image } from "lucide-react";
import { SquareArrowExpand01Icon } from "hugeicons-react";
import { BrowserVncViewer } from "../BrowserVncViewer";

type BrowserSnapshot = {
  url?: string;
  screenshot?: string;
  dom_text?: string;
};

type ViewMode = "screenshot" | "vnc";

export function PreviewPanel() {
  const stream = useStreamContext();
  const browserSnapshot = (stream.values as Record<string, unknown> | undefined)
    ?.browser_snapshot as BrowserSnapshot | undefined;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDomText, setShowDomText] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("screenshot");

  // Show panel if there's a screenshot OR if agent has used browser (even without screenshot)
  const hasBrowserActivity = browserSnapshot?.screenshot || browserSnapshot?.url;

  if (!hasBrowserActivity) {
    return null;
  }

  // Handle base64 image with or without data URL prefix
  const getImageSrc = (screenshot: string) => {
    if (screenshot.startsWith("data:image/")) {
      return screenshot;
    }
    return `data:image/png;base64,${screenshot}`;
  };

  return (
    <>
      {/* Direct Browser Preview - Will share space with todos when added */}
      <div className="relative mx-auto w-full max-w-3xl">
        <div className="flex items-start gap-3">
          {/* Browser Preview Section - Will take left portion when todos are added */}
            

          <div className="flex flex-col gap-1">
            {/* Browser Snapshot Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="group relative"
            >
              {/* Thumbnail Container */}
              <div data-radius="radius2" className="border-border relative h-20 w-32 overflow-hidden border shadow-sm transition-all duration-200 group-hover:scale-120 group-hover:border-primary/30 group-hover:shadow-lg">
                {browserSnapshot.screenshot ? (
                  <>
                    <img
                      src={getImageSrc(browserSnapshot.screenshot)}
                      alt="Browser preview"
                      className="h-full w-full object-cover object-top"
                    />
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 transition-colors duration-200" />
                    {/* Expand Icon - Bottom Right */}
                    <div className="absolute bottom-1 right-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <div data-radius="radius1" className="bg-background/80 p-1.5 shadow-sm backdrop-blur-sm">
                        <SquareArrowExpand01Icon className="h-5 w-5 text-foreground" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-muted flex h-full w-full flex-col items-center justify-center gap-1">
                    <Monitor className="text-muted-foreground h-6 w-6" />
                    <span className="text-muted-foreground text-[10px]">Click for Live View</span>
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* TODO Section - Will take right portion of horizontal space */}
          {/* Placeholder for future task todos - will be added here */}
        </div>
      </div>

      {/* Full Browser Snapshot Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Browser View</DialogTitle>
              
              {/* Mode toggle buttons */}
              <div className="bg-muted flex rounded-md p-0.5" data-radius="radius2">
                <button
                  type="button"
                  onClick={() => setViewMode("screenshot")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium transition-colors",
                    viewMode === "screenshot"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Image className="h-3 w-3" />
                  Screenshot
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("vnc")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium transition-colors",
                    viewMode === "vnc"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Monitor className="h-3 w-3" />
                  Live Control
                </button>
              </div>
            </div>
            
            {viewMode === "screenshot" && browserSnapshot.dom_text && (
              <button
                type="button"
                className={cn(
                  "text-muted-foreground mt-2 flex items-center gap-2 text-sm font-normal transition-colors hover:text-foreground",
                )}
                onClick={() => setShowDomText((prev) => !prev)}
                aria-expanded={showDomText}
                aria-label="Toggle DOM text"
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    showDomText ? "rotate-180" : "rotate-0",
                  )}
                />
                <span>DOM Text</span>
              </button>
            )}
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto">
            {viewMode === "screenshot" ? (
              <>
                {/* URL Bar */}
                {browserSnapshot.url && (
                  <div data-radius="radius2" className="border rounded-full bg-background px-3 py-2">
                    <span className="text-sm">{browserSnapshot.url}</span>
                  </div>
                )}

                {/* Screenshot */}
                {browserSnapshot.screenshot ? (
                  <div data-radius="radius2" className="overflow-hidden border">
                    <img
                      src={getImageSrc(browserSnapshot.screenshot)}
                      alt="Browser screenshot"
                      className="w-full"
                    />
                  </div>
                ) : (
                  <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">
                    No screenshot available yet
                  </div>
                )}

                {/* DOM Text (Collapsible) */}
                {browserSnapshot.dom_text && showDomText && (
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <h4 className="mb-2 text-sm font-semibold">DOM Content</h4>
                    <pre className="max-h-96 overflow-auto text-xs">
                      {browserSnapshot.dom_text}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div className="h-[600px]">
                <BrowserVncViewer enabled={viewMode === "vnc"} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
