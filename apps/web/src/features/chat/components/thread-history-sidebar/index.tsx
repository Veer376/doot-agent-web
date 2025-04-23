"use client";

import { Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ThreadHistorySidebarProps {
  className?: string;
  open: boolean;
}

export function ThreadHistorySidebar({
  className,
  open,
}: ThreadHistorySidebarProps) {
  return (
    <div
      className={cn(
        "fixed top-0 right-0 z-10 h-screen border-l border-gray-200 bg-white shadow-lg transition-all duration-300",
        open ? "w-80 md:w-xl" : "w-0 overflow-hidden border-l-0",
        className,
      )}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 p-4">
            <h2 className="text-lg font-semibold">History</h2>
          </div>

          {Array.from({ length: 30 }).map((_, index) => (
            <div
              key={`thread-history-${index}`}
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-gray-200" />
                <div className="flex flex-col">
                  <p className="text-sm font-medium">Thread {index + 1}</p>
                  <p className="text-sm text-gray-500">2 days ago</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
