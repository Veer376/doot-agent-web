"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { StreamProvider } from "@/features/chat/providers/Stream";
import { ThreadStateProvider, useRightPanel, useThreadFileState } from "@/features/chat/providers/ThreadState";
import { Thread } from "./components/thread";
import { ThreadHeader } from "./components/thread/thread-header";
import { RightPanel, FileViewerPanel } from "@/components/panels";
import { useQueryState } from "@/hooks/use-query-state";

// Right panel width constraints
const RIGHT_MIN = 280;
const RIGHT_MAX = 500;
const RIGHT_DEFAULT = 320;

/**
 * Inner component that uses the right panel context
 */
function ChatInterfaceInner(): React.ReactNode {
  const [threadId] = useQueryState("threadId");
  const { isOpen: isRightPanelOpen, width: rightPanelWidth, setWidth: setRightPanelWidth } = useRightPanel();
  const { activeTab } = useThreadFileState(threadId);
  const dragStartWidth = useRef<number | null>(null);

  // Handle right panel resize
  const handleRightResize = useCallback(
    (totalDelta: number) => {
      if (dragStartWidth.current === null) {
        dragStartWidth.current = rightPanelWidth;
      }
      const newWidth = dragStartWidth.current - totalDelta;
      setRightPanelWidth(Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, newWidth)));
    },
    [rightPanelWidth, setRightPanelWidth]
  );

  // Reset drag start on mouse up
  useEffect(() => {
    const handleMouseUp = () => {
      dragStartWidth.current = null;
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // Determine if we should show the thread (chat) or file viewer
  const showFileViewer = activeTab !== "agent" && activeTab !== "";

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      {/* Thread Header with workspace, files button, and open file tabs */}
      <ThreadHeader />

      {/* Main content area - horizontal flex for chat + right panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Main content area - shows Thread or FileViewer based on activeTab */}
        <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
          {showFileViewer ? (
            <FileViewerPanel filePath={activeTab} />
          ) : (
            <Thread />
          )}
        </div>

        {/* Resize handle for right panel */}
        {isRightPanelOpen && (
          <div
            className="w-1 cursor-col-resize bg-border hover:bg-primary/30 active:bg-primary/50 transition-colors shrink-0"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;

              const handleMouseMove = (e: MouseEvent) => {
                handleRightResize(e.clientX - startX);
              };

              const handleMouseUp = () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
              };

              document.addEventListener("mousemove", handleMouseMove);
              document.addEventListener("mouseup", handleMouseUp);
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
            }}
          />
        )}

        {/* Right Panel - Files viewer */}
        {isRightPanelOpen && (
          <div 
            style={{ width: rightPanelWidth }} 
            className="shrink-0 flex flex-col min-h-0 overflow-hidden"
          >
            <RightPanel />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The parent component containing the chat interface.
 */
export default function ChatInterface(): React.ReactNode {
  return (
    <ThreadStateProvider>
      <StreamProvider>
        <ChatInterfaceInner />
      </StreamProvider>
    </ThreadStateProvider>
  );
}
