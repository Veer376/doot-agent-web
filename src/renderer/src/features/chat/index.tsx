"use client";

import React from "react";
import { StreamProvider } from "@/features/chat/providers/Stream";
import { Thread } from "./components/thread";

/**
 * The parent component containing the chat interface.
 */
export default function ChatInterface(): React.ReactNode {
  return (
    <StreamProvider>
      <div className="flex h-full overflow-x-hidden">
        <Thread />
      </div>
    </StreamProvider>
  );
}
