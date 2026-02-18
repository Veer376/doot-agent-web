"use client";

import { Music, Video } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MediaViewerProps {
  filePath: string;
  base64Content: string;
  mimeType: string;
  mediaType: "video" | "audio";
}

export function MediaViewer({
  filePath,
  base64Content,
  mimeType,
  mediaType,
}: MediaViewerProps): React.JSX.Element {
  const fileName = filePath.split("/").pop() || filePath;
  const mediaUrl = `data:${mimeType};base64,${base64Content}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-background/50 flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
        <span className="truncate">{fileName}</span>
        <span className="text-muted-foreground/50">•</span>
        <span className="capitalize">{mediaType}</span>
      </div>

      {/* Media player */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex min-h-full flex-col items-center justify-center gap-6 p-8">
          {mediaType === "video" ? (
            <>
              <Video className="text-muted-foreground/30 size-16" />
              <video
                controls
                className="max-h-[70vh] max-w-full rounded-lg shadow-lg"
                preload="metadata"
              >
                <source
                  src={mediaUrl}
                  type={mimeType}
                />
                Your browser does not support the video tag.
              </video>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4">
                <div className="bg-accent/10 flex h-32 w-32 items-center justify-center rounded-full">
                  <Music className="text-muted-foreground/50 size-16" />
                </div>
                <div className="text-center">
                  <div className="font-medium text-foreground">{fileName}</div>
                  <div className="text-sm text-muted-foreground">
                    Audio File
                  </div>
                </div>
              </div>
              <audio
                controls
                className="w-full max-w-md"
                preload="metadata"
              >
                <source
                  src={mediaUrl}
                  type={mimeType}
                />
                Your browser does not support the audio tag.
              </audio>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
