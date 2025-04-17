"use client";

import React from "react";
import { StreamProvider } from "@/components/chat/providers/Stream";
import { Thread } from "./components/thread";
import { useAgentsContext } from "@/providers/Agents";

/**
 * The parent component containing the chat interface.
 */
export default function ChatInterface(): React.ReactNode {
  const { agents } = useAgentsContext();

  console.log("agents", agents);
  return (
    <StreamProvider>
      <Thread />
    </StreamProvider>
  );
}
