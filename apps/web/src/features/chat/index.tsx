"use client";

import React, { useState, useRef, useEffect } from "react";
import { StreamProvider } from "@/features/chat/providers/Stream";
import { Thread } from "./components/thread";
import { ConfigurationSidebar } from "./components/configuration-sidebar";
import { ThreadHistorySidebar } from "./components/thread-history-sidebar";
import { SidebarButtons } from "./components/sidebar-buttons";

/**
 * The parent component containing the chat interface.
 */
export default function ChatInterface(): React.ReactNode {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const historyRef = useRef<HTMLDivElement>(null);
  const configRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Check if history sidebar is open and the click is outside of it and the buttons
      if (
        historyOpen &&
        historyRef.current &&
        !historyRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setHistoryOpen(false);
      }

      // Check if config sidebar is open and the click is outside of it and the buttons
      if (
        configOpen &&
        configRef.current &&
        !configRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setConfigOpen(false);
      }
    }

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);

    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [historyOpen, configOpen]);

  return (
    <StreamProvider>
      <div className="flex h-full overflow-x-hidden">
        <div className="flex h-full flex-1 flex-col p-4">
          <Thread />
        </div>
        <SidebarButtons
          ref={buttonRef}
          historyOpen={historyOpen}
          setHistoryOpen={setHistoryOpen}
          configOpen={configOpen}
          setConfigOpen={setConfigOpen}
        />
        <ThreadHistorySidebar
          ref={historyRef}
          open={historyOpen}
          setOpen={setHistoryOpen}
        />
        <ConfigurationSidebar
          ref={configRef}
          open={configOpen}
        />
      </div>
    </StreamProvider>
  );
}
