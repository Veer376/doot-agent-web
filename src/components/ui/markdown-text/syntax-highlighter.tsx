"use client";

import { lazy, Suspense } from "react";
import type { SyntaxHighlighterProps } from "./syntax-highlighter-impl";

const HighlightedCode = lazy(() =>
  import("./syntax-highlighter-impl").then((module) => ({
    default: module.SyntaxHighlighter,
  })),
);

// Keep code readable immediately while the optional highlighting engine loads.
export function SyntaxHighlighter(props: SyntaxHighlighterProps) {
  return (
    <Suspense
      fallback={
        <pre
          className={props.className}
          style={{ overflowX: "auto", padding: "0.875rem 1rem 1rem" }}
        >
          <code>{props.children}</code>
        </pre>
      }
    >
      <HighlightedCode {...props} />
    </Suspense>
  );
}
