"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

type ToolContainerProps = {
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  title?: string;
  code?: string;
  header?: React.ReactNode; // Custom header node; overrides title/code
  children?: React.ReactNode;
};

export function ToolContainer({
  className,
  headerClassName,
  contentClassName,
  title,
  code,
  header,
  children,
}: ToolContainerProps) {
  return (
    <div
      data-radius="surface"
      className={cn("overflow-hidden border border-border", className)}
    >
      <div
        className={cn(
          "border-b border-border bg-muted/40 px-4 py-2",
          headerClassName,
        )}
      >
        {header ? (
          header
        ) : (
          <h3 className="font-medium text-foreground">
            {title}
            {code && (
              <code className="ml-2 rounded bg-muted px-2 py-1 text-sm">
                {code}
              </code>
            )}
          </h3>
        )}
      </div>
      <div className={cn("bg-muted", contentClassName)}>
        <div className="p-3">{children}</div>
      </div>
    </div>
  );
}

export default ToolContainer;
