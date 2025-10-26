import { useStreamContext } from "@/features/chat/providers/Stream";

export function BrowserSnapshotView() {
  const stream = useStreamContext();
  const browserSnapshot = stream.values?.browser_snapshot;

  // For debugging - show component even if no data
  const showDebug = true; // Set to false to hide when no data

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
    <div className="bg-muted/30 mb-4 rounded-lg border p-4">
      <h3 className="mb-2 text-sm font-semibold">Browser Snapshot</h3>

      {!browserSnapshot ? (
        <div className="text-muted-foreground text-xs">
          No browser snapshot data available. Check console for debug info.
        </div>
      ) : (
        <>
          {browserSnapshot.url && (
            <div className="mb-2">
              <span className="text-muted-foreground text-xs">URL: </span>
              <span className="font-mono text-xs">{browserSnapshot.url}</span>
            </div>
          )}

          {browserSnapshot.screenshot && (
            <div className="mt-2">
              <img
                src={getImageSrc(browserSnapshot.screenshot)}
                alt="Browser screenshot"
                className="w-full rounded border"
              />
            </div>
          )}

          {browserSnapshot.dom_text && (
            <details className="mt-2">
              <summary className="text-muted-foreground cursor-pointer text-xs">
                DOM Text (click to expand)
              </summary>
              <pre className="bg-background mt-2 max-h-40 overflow-x-auto overflow-y-auto rounded border p-2 text-xs">
                {browserSnapshot.dom_text}
              </pre>
            </details>
          )}
        </>
      )}
    </div>
  );
}
