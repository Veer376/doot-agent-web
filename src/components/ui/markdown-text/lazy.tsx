"use client";

import { lazy, memo, Suspense, type ComponentProps } from "react";
import type { MarkdownText as MarkdownRenderer } from "./index";
import { cn } from "@/lib/utils";

const Renderer = lazy(() =>
  import("./index").then((module) => ({ default: module.MarkdownText })),
);

// An empty chat does not need Markdown, math, citations, or diagram rendering.
export const MarkdownText = memo(function MarkdownText(
  props: ComponentProps<typeof MarkdownRenderer>,
) {
  return (
    <Suspense
      fallback={
        <div className={cn("break-words whitespace-pre-wrap", props.className)}>
          {props.children}
        </div>
      }
    >
      <Renderer {...props} />
    </Suspense>
  );
});
