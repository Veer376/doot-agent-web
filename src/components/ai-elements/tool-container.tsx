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
    <div data-radius="radius2" className={cn("overflow-hidden rounded-lg border border-gray-200", className)}>
      <div className={cn("border-b border-gray-200 bg-gray-50 px-4 py-2", headerClassName)}>
        {header ? (
          header
        ) : (
          <h3 className="font-medium text-gray-900">
            {title}
            {code && (
              <code className="ml-2 rounded bg-gray-100 px-2 py-1 text-sm">{code}</code>
            )}
          </h3>
        )}
      </div>
      <div className={cn("bg-gray-100", contentClassName)}>
        <div className="p-3">{children}</div>
      </div>
    </div>
  );
}

export default ToolContainer;
