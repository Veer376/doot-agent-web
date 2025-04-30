"use client";

import { useThreadsContext } from "../contexts/ThreadContext";
import { Loader2 } from "lucide-react";

export function ThreadLoadingIndicator() {
  const { isChangingThreads } = useThreadsContext();

  if (!isChangingThreads) return null;

  return (
    <div className="bg-background/80 absolute top-0 right-0 z-10 m-4 flex items-center justify-center rounded-md p-4 shadow-sm backdrop-blur-sm">
      <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      <span className="text-muted-foreground ml-2 text-sm">
        Loading threads...
      </span>
    </div>
  );
}
