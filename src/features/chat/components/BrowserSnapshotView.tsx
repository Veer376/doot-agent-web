import { useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { useStreamContext } from "@/features/chat/providers/Stream";
import { cn } from "@/lib/utils";

type BrowserSnapshot = {
  url?: string;
  screenshot?: string;
  dom_text?: string;
};

export function BrowserSnapshotView() {
  const stream = useStreamContext();
  const browserSnapshot = (stream.values as Record<string, unknown> | undefined)
    ?.browser_snapshot as BrowserSnapshot | undefined;
  const [showDomText, setShowDomText] = useState(false);

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
    <div
      data-radius="radius2"
      className="bg-muted/30 mb-4 w-full max-w-lg border px-0 pt-3 pb-0"
    >
      <div className="flex items-center justify-between px-4 pb-3">
        <h3 className="text-sm font-semibold">Browser Snapshot</h3>
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
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 transition-transform",
              showDomText ? "rotate-180" : "rotate-0",
            )}
          />
        </button>
      </div>

      {!browserSnapshot ? (
        <div className="text-muted-foreground px-4 pb-4 text-xs">
          No browser snapshot data available. Check console for debug info.
        </div>
      ) : (
        <>
          {browserSnapshot.url && (
            <div
              data-radius="radius2"
              className="bg-background text-muted-foreground mx-4 mb-3 border px-3 py-2 text-xs font-medium"
            >
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
      )}
    </div>
  );
}
