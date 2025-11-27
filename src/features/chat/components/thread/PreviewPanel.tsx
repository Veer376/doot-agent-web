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
import { ImageIcon, FileTextIcon } from "@/components/icons";
import { SquareArrowExpand01Icon } from "hugeicons-react";

type BrowserSnapshot = {
  url?: string;
  screenshot?: string;
  dom_text?: string;
};

type TabType = "screenshot" | "text";

export function PreviewPanel() {
  const stream = useStreamContext();
  const browserSnapshot = (stream.values as Record<string, unknown> | undefined)
    ?.browser_snapshot as BrowserSnapshot | undefined;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("screenshot");

  if (!browserSnapshot?.screenshot) {
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
              </div>
            </button>
          </div>

          {/* TODO Section - Will take right portion of horizontal space */}
          {/* Placeholder for future task todos - will be added here */}
        </div>
      </div>

      {/* Full Browser Snapshot Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="flex h-[90vh] max-w-4xl flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Browser Snapshot</DialogTitle>
            
            {/* Tab Buttons */}
            <div className="mt-4 flex gap-1 border-b border-border">
              <button
                type="button"
                onClick={() => setActiveTab("screenshot")}
                className={cn(
                  "inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === "screenshot"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <ImageIcon className="h-4 w-4" />
                Screenshot
              </button>
              {browserSnapshot.dom_text && (
                <button
                  type="button"
                  onClick={() => setActiveTab("text")}
                  className={cn(
                    "inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                    activeTab === "text"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileTextIcon className="h-4 w-4" />
                  Text
                </button>
              )}
            </div>
          </DialogHeader>

          {/* Tab Content - Fixed height container */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "screenshot" ? (
              <div className="flex h-full flex-col space-y-4 overflow-y-auto">
                {/* URL Bar */}
                {browserSnapshot.url && (
                  <div data-radius="radius2" className="flex-shrink-0 rounded-full border bg-background px-3 py-2">
                    <span className="text-sm">{browserSnapshot.url}</span>
                  </div>
                )}

                {/* Screenshot */}
                {browserSnapshot.screenshot && (
                  <div data-radius="radius2" className="flex-shrink-0 overflow-hidden border">
                    <img
                      src={getImageSrc(browserSnapshot.screenshot)}
                      alt="Browser screenshot"
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full flex-col space-y-4 overflow-y-auto">
                {/* URL Bar */}
                {browserSnapshot.url && (
                  <div data-radius="radius2" className="flex-shrink-0 rounded-full border bg-background px-3 py-2">
                    <span className="text-sm">{browserSnapshot.url}</span>
                  </div>
                )}

                {/* DOM Text */}
                {browserSnapshot.dom_text && (
                  <div className="flex-1 overflow-hidden rounded-lg border bg-muted/50 p-4">
                    <h4 className="mb-2 text-sm font-semibold">DOM Content</h4>
                    <pre className="h-[calc(100%-2rem)] overflow-auto text-xs">
                      {browserSnapshot.dom_text}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
