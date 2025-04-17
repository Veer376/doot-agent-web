"use client";

import React from "react";
import { StreamProvider } from "@/components/chat/providers/Stream";
import { Thread } from "./components/thread";

/**
 * The parent component containing the chat interface.
 */
export default function ChatInterface(): React.ReactNode {
  return (
    <StreamProvider>
      <Thread />
    </StreamProvider>
  );
}
