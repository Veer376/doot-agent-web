"use client";

import { useState, Component, type ReactNode } from "react";
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
import { TodoList, type Todo } from "./TodoList";

type BrowserSnapshot = {
  url?: string;
  screenshot?: string;
  dom_text?: string;
};

type TabType = "screenshot" | "text";

// Error Boundary Component
class PreviewPanelErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[PreviewPanel] Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto w-full max-w-3xl">
          <div
            data-radius="radius"
            className="border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400"
          >
            <p className="font-semibold">Preview Panel Error</p>
            <p className="mt-1 text-xs opacity-80">
              {this.state.error?.message || "Failed to render preview"}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function PreviewPanelContent() {
  const stream = useStreamContext();
  const values = stream.values as Record<string, unknown> | undefined;

  // Extract state from both local and cloud agent formats
  const browserSnapshot = values?.browser_snapshot as
    | BrowserSnapshot
    | undefined;
  const todos = values?.todos as Todo[] | undefined;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("screenshot");

  // Don't render if there's nothing to show
  const hasBrowserSnapshot = !!browserSnapshot?.screenshot;
  const hasTodos = !!todos && todos.length > 0;

  if (!hasBrowserSnapshot && !hasTodos) {
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
      {/* Preview Panel - Shows agent state (browser snapshot, todos) */}
      <div
        className="relative mx-auto w-full"
        style={{ maxWidth: "var(--composer-max-width)" }}
      >
        <div className="flex flex-col gap-3">
          {/* Browser Preview Section */}
          {hasBrowserSnapshot && browserSnapshot?.screenshot && (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="group relative w-fit"
              >
                {/* Thumbnail Container */}
                <div
                  data-radius="radius"
                  className="shadow-brand group-hover:shadow-brand-focus relative h-20 w-32 overflow-hidden border border-border transition-all duration-200 group-hover:scale-105"
                >
                  <img
                    src={getImageSrc(browserSnapshot.screenshot)}
                    alt="Browser preview"
                    className="h-full w-full object-cover object-top"
                  />
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 transition-colors duration-200" />
                  {/* Expand Icon - Bottom Right */}
                  <div className="absolute bottom-1 right-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <div
                      data-radius="small-radius"
                      className="bg-background/80 p-1.5 shadow-sm backdrop-blur-sm"
                    >
                      <SquareArrowExpand01Icon className="h-5 w-5 text-foreground" />
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Todos Section - Expandable list */}
          {hasTodos && todos && (
            <div
              data-radius="radius"
              className="hover:border-border/80 flex items-start gap-3 border border-border bg-card p-3 shadow-sm transition-all duration-200"
            >
              <div className="min-w-0 flex-1">
                <TodoList
                  todos={todos}
                  expandable={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Browser Snapshot Modal */}
      {hasBrowserSnapshot && browserSnapshot && (
        <Dialog
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        >
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
                      : "border-transparent text-muted-foreground hover:text-foreground",
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
                        : "border-transparent text-muted-foreground hover:text-foreground",
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
                    <div
                      data-radius="radius"
                      className="flex-shrink-0 rounded-full border bg-background px-3 py-2"
                    >
                      <span className="text-sm">{browserSnapshot.url}</span>
                    </div>
                  )}

                  {/* Screenshot */}
                  {browserSnapshot.screenshot && (
                    <div
                      data-radius="radius"
                      className="flex-shrink-0 overflow-hidden border"
                    >
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
                    <div
                      data-radius="radius"
                      className="flex-shrink-0 rounded-full border bg-background px-3 py-2"
                    >
                      <span className="text-sm">{browserSnapshot.url}</span>
                    </div>
                  )}

                  {/* DOM Text */}
                  {browserSnapshot.dom_text && (
                    <div
                      data-radius="radius"
                      className="bg-muted/50 flex-1 overflow-hidden border p-4"
                    >
                      <h4 className="mb-2 text-sm font-semibold">
                        DOM Content
                      </h4>
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
      )}
    </>
  );
}

// Export with Error Boundary wrapper
export function PreviewPanel() {
  return (
    <PreviewPanelErrorBoundary>
      <PreviewPanelContent />
    </PreviewPanelErrorBoundary>
  );
}
