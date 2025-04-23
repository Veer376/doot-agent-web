"use client";

import React, { useState } from "react";
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

  return (
    <StreamProvider>
      <div className="flex h-full overflow-x-hidden">
        <div className="flex h-full flex-1 flex-col p-4">
          <Thread />
        </div>
        <SidebarButtons
          historyOpen={historyOpen}
          setHistoryOpen={setHistoryOpen}
          configOpen={configOpen}
          setConfigOpen={setConfigOpen}
        />
        <ThreadHistorySidebar
          open={historyOpen}
          setOpen={setHistoryOpen}
        />
        <ConfigurationSidebar open={configOpen} />
      </div>
    </StreamProvider>
  );
}
