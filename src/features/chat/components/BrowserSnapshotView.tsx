import { useState } from "react";
import { ChevronDown, Monitor, Image } from "lucide-react";
import { useStreamContext } from "@/features/chat/providers/Stream";
import { cn } from "@/lib/utils";
import { BrowserVncViewer } from "./BrowserVncViewer";

type BrowserSnapshot = {
  url?: string;
  screenshot?: string;
  dom_text?: string;
};

type ViewMode = "screenshot" | "vnc";

export function BrowserSnapshotView() {
  const stream = useStreamContext();
  const browserSnapshot =
    (stream.values as Record<string, unknown> | undefined)
      ?.browser_snapshot as BrowserSnapshot | undefined;
  const [showDomText, setShowDomText] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("screenshot");

  // Only show placeholder when explicitly toggled for debugging
  const showDebug = false;

  if (!browserSnapshot && !showDebug) {
    return null;
  }

  // Handle base64 image with or without data URL prefix
  const getImageSrc = (screenshot: string) => {
    if (screenshot.startsWith("data:image/")) {
      return screenshot;
    }
    // Assume it's base64 PNG if no prefix
    return `data:image/png;base64,${screenshot}`;
  };

  return (
    <div data-radius="radius2" className="bg-muted/30 mb-4 w-full max-w-2xl border px-0 pb-0 pt-3">
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Browser View</h3>
          
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
        
        {viewMode === "screenshot" && (
          <button
            type="button"
            className={cn(
              "text-muted-foreground inline-flex h-6 w-6 items-center justify-center transition-colors",
              browserSnapshot?.dom_text
                ? "hover:bg-muted focus-visible:ring-2"
                : "cursor-not-allowed opacity-50",
            )}
            data-radius="radius2"
            onClick={() =>
              browserSnapshot?.dom_text && setShowDomText((prev) => !prev)
            }
            aria-expanded={showDomText}
            aria-label="Toggle DOM text"
            disabled={!browserSnapshot?.dom_text}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                showDomText ? "rotate-180" : "rotate-0",
              )}
            />
          </button>
        )}
      </div>

      {!browserSnapshot ? (
        <div className="px-4 pb-4 text-xs text-muted-foreground">
          No browser data available. Start using browser tools to see the view.
        </div>
      ) : (
        <>
          {viewMode === "screenshot" ? (
            <>
              {browserSnapshot.url && (
                <div data-radius="radius2" className="mx-4 mb-3 border bg-background px-3 py-2 text-xs font-medium text-muted-foreground">
                  {browserSnapshot.url}
                </div>
              )}

              {browserSnapshot.screenshot && (
                <div className="overflow-hidden border-t">
                  <img
                    src={getImageSrc(browserSnapshot.screenshot)}
                    alt="Browser screenshot"
                    className="w-full"
                  />
                </div>
              )}

              {browserSnapshot.dom_text && showDomText && (
                <div className="px-4 pb-4">
                  <pre className="bg-background max-h-40 overflow-x-auto overflow-y-auto rounded border p-2 text-xs">
                    {browserSnapshot.dom_text}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="px-4 pb-4">
              <BrowserVncViewer enabled={viewMode === "vnc"} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
