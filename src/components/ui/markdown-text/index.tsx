"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import React, { FC, memo, useState } from "react";
import {
  Note02Icon as NoteIcon,
  TipsIcon as TipIcon,
  Alert02Icon as WarningIcon,
  Alert02Icon as ImportantIcon,
  Note02Icon as InfoIcon,
  TaskDaily02Icon as TodoIcon,
} from "@/components/icons";
import { CopyIcon, CheckmarkCircleIcon } from "@/components/icons";
import { SyntaxHighlighter } from "./syntax-highlighter";
import { MermaidDiagram } from "./mermaid-diagram";

import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { cn } from "@/lib/utils";

import "katex/dist/katex.min.css";
// Toggle line numbers for fenced code blocks (global default)
const SHOW_CODE_LINE_NUMBERS = true;

interface CodeHeaderProps {
  language?: string;
  code: string;
}

const useCopyToClipboard = ({
  copiedDuration = 3000,
}: {
  copiedDuration?: number;
} = {}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copyToClipboard = (value: string) => {
    if (!value) return;

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), copiedDuration);
    });
  };

  return { isCopied, copyToClipboard };
};

const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  return (
    <div className="text-foreground flex items-center justify-between gap-3 rounded-t-md px-4 pt-2 text-xs leading-tight font-medium">
      <span className="lowercase opacity-80 [&>span]:text-[0.7rem]">
        {language}
      </span>
      <TooltipIconButton
        tooltip="Copy"
        onClick={onCopy}
      >
        {!isCopied && <CopyIcon size="xs" />}
        {isCopied && <CheckmarkCircleIcon size="xs" />}
      </TooltipIconButton>
    </div>
  );
};

const defaultComponents: any = {
  // Callout-aware paragraph that detects leading labels (even when bolded) like "**Note:**"
  // and renders a themed box. Falls back to normal <p> otherwise.
  p: ({
    className,
    children,
    ...props
  }: {
    className?: string;
    children: any;
  }) => {
    const getText = (node: any): string => {
      if (typeof node === "string") return node;
      if (Array.isArray(node)) return node.map(getText).join("");
      if (React.isValidElement(node))
        return getText((node.props as any)?.children);
      return "";
    };

    const fullText = getText(children);
    const leadingRegex =
      /^\s*(note|tip|info|warning|important|caution|todo):\s*/i;
    const elementOnlyRegex =
      /^\s*(note|tip|info|warning|important|caution|todo):\s*$/i;
    const match = fullText.match(leadingRegex);
    if (!match) {
      return (
        <p
          className={cn("mt-4 mb-4 leading-7 first:mt-0 last:mb-0", className)}
          {...props}
        >
          {children}
        </p>
      );
    }

    const labelKey = match[1].toLowerCase();
    const labelMap: Record<string, { wrapper: string; label: string }> = {
      note: {
        wrapper:
          "my-4 rounded-lg border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300",
        label: "font-semibold text-amber-700 dark:text-amber-300",
      },
      tip: {
        wrapper:
          "my-4 rounded-lg border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300",
        label: "font-semibold text-emerald-700 dark:text-emerald-300",
      },
      info: {
        wrapper:
          "my-4 rounded-lg border-sky-200 bg-sky-50/70 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300",
        label: "font-semibold text-sky-700 dark:text-sky-300",
      },
      warning: {
        wrapper:
          "my-4 rounded-lg border-orange-200 bg-orange-50/70 text-orange-900 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300",
        label: "font-semibold text-orange-700 dark:text-orange-300",
      },
      important: {
        wrapper:
          "my-4 rounded-lg border-red-200 bg-red-50/70 text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300",
        label: "font-semibold text-red-700 dark:text-red-300",
      },
      caution: {
        wrapper:
          "my-4 rounded-lg border-yellow-200 bg-yellow-50/70 text-yellow-900 dark:border-yellow-900/40 dark:bg-yellow-950/20 dark:text-yellow-300",
        label: "font-semibold text-yellow-700 dark:text-yellow-300",
      },
      todo: {
        wrapper:
          "my-4 rounded-lg border-purple-200 bg-purple-50/70 text-purple-900 dark:border-purple-900/40 dark:bg-purple-950/20 dark:text-purple-300",
        label: "font-semibold text-purple-700 dark:text-purple-300",
      },
    };

    // Strip the leading label from the actual children, even if wrapped in <strong>
    let removed = false;
    const stripLeading = (node: any): any => {
      if (removed) return node;
      if (typeof node === "string") {
        const replaced = node.replace(leadingRegex, "");
        if (replaced !== node) removed = true;
        return replaced;
      }
      if (Array.isArray(node)) {
        return node.map((n) => stripLeading(n));
      }
      if (React.isValidElement(node)) {
        const childText = getText((node.props as any)?.children || "");
        if (elementOnlyRegex.test(childText) && !removed) {
          removed = true;
          return null; // drop the entire element containing just the label
        }
        const newChildren = stripLeading((node.props as any)?.children);
        return React.cloneElement(
          node,
          { ...(node.props as any) },
          newChildren,
        );
      }
      return node;
    };

    const content = stripLeading(children);
    const { wrapper, label } = labelMap[labelKey] ?? labelMap.note;
    const iconMap: Record<string, React.ReactNode> = {
      note: (
        <NoteIcon
          size="xs"
          className="text-amber-600 dark:text-amber-300"
        />
      ),
      tip: (
        <TipIcon
          size="xs"
          className="text-emerald-600 dark:text-emerald-300"
        />
      ),
      info: (
        <InfoIcon
          size="xs"
          className="text-sky-600 dark:text-sky-300"
        />
      ),
      warning: (
        <WarningIcon
          size="xs"
          className="text-orange-600 dark:text-orange-300"
        />
      ),
      important: (
        <ImportantIcon
          size="xs"
          className="text-red-600 dark:text-red-300"
        />
      ),
      caution: (
        <WarningIcon
          size="xs"
          className="text-yellow-600 dark:text-yellow-300"
        />
      ),
      todo: (
        <TodoIcon
          size="xs"
          className="text-purple-600 dark:text-purple-300"
        />
      ),
    };
    // Badge border colors to blend with wrapper border for each callout type
    const badgeBorderMap: Record<string, string> = {
      note: "border-amber-300 dark:border-amber-900/60",
      tip: "border-emerald-300 dark:border-emerald-900/60",
      info: "border-sky-300 dark:border-sky-900/60",
      warning: "border-orange-300 dark:border-orange-900/60",
      important: "border-red-300 dark:border-red-900/60",
      caution: "border-yellow-300 dark:border-yellow-900/60",
      todo: "border-purple-300 dark:border-purple-900/60",
    };
    const labelText =
      match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();

    return (
      <>
        {/* Consistency in padding and margin whatever */}
        <div className={cn(wrapper, "relative px-3 py-2.5")}>
          <span
            className={cn(
              `absolute -top-1.5 -left-1.5 flex size-6 items-center justify-center rounded-full bg-transparent`,
              badgeBorderMap[labelKey] ?? badgeBorderMap.note,
            )}
          >
            {iconMap[labelKey] ?? iconMap.note}
          </span>
          <div
            className={cn("m-0", className)}
            {...props}
          >
            <p className="m-0 leading-6">
              <span className={label}>{labelText}:</span> {content}
            </p>
          </div>
        </div>
      </>
    );
  },
  h1: ({ className, ...props }: { className?: string }) => (
    <h1
      className={cn(
        "mb-5 scroll-m-20 text-2xl font-bold tracking-tight last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }: { className?: string }) => (
    <h2
      className={cn(
        "mt-5 mb-2 scroll-m-20 text-xl font-semibold tracking-tight first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: { className?: string }) => (
    <h3
      className={cn(
        "mt-3 mb-2 scroll-m-20 text-lg font-semibold tracking-tight first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }: { className?: string }) => (
    <h4
      className={cn(
        "mt-4 mb-2 scroll-m-20 text-base font-semibold tracking-tight first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }: { className?: string }) => (
    <h5
      className={cn(
        "my-3 text-base font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h6: ({ className, ...props }: { className?: string }) => (
    <h6
      className={cn("my-2 text-sm font-medium first:mt-0 last:mb-0", className)}
      {...props}
    />
  ),
  strong: ({ className, ...props }: { className?: string }) => (
    <strong
      className={cn("font-semibold", className)}
      {...props}
    />
  ),
  em: ({ className, ...props }: { className?: string }) => (
    <em
      className={cn("italic", className)}
      {...props}
    />
  ),
  a: ({ className, ...props }: { className?: string }) => (
    <a
      className={cn(
        "text-primary font-medium underline underline-offset-4",
        className,
      )}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  blockquote: ({ className, ...props }: { className?: string }) => (
    <blockquote
      className={cn("border-l-2 pl-6 italic", className)}
      {...props}
    />
  ),
  ul: ({ className, ...props }: { className?: string }) => (
    <ul
      className={cn("my-5 ml-6 list-disc [&>li]:mt-2", className)}
      {...props}
    />
  ),
  ol: ({ className, ...props }: { className?: string }) => (
    <ol
      className={cn("my-5 ml-6 list-decimal [&>li]:mt-2", className)}
      {...props}
    />
  ),
  hr: ({ className, ...props }: { className?: string }) => (
    <hr
      className={cn("my-5 border-b", className)}
      {...props}
    />
  ),
  table: ({ className, ...props }: { className?: string }) => (
    <table
      className={cn(
        "my-5 w-full border-separate border-spacing-0 overflow-y-auto",
        className,
      )}
      {...props}
    />
  ),
  th: ({ className, ...props }: { className?: string }) => (
    <th
      className={cn(
        "bg-muted px-4 py-2 text-left first:rounded-tl-lg last:rounded-tr-lg [&[align=center]]:text-center [&[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: { className?: string }) => (
    <td
      className={cn(
        "border-b border-l px-4 py-2 text-left last:border-r [&[align=center]]:text-center [&[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),
  tr: ({ className, ...props }: { className?: string }) => (
    <tr
      className={cn(
        "m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg",
        className,
      )}
      {...props}
    />
  ),
  sup: ({ className, ...props }: { className?: string }) => (
    <sup
      className={cn("[&>a]:text-xs [&>a]:no-underline", className)}
      {...props}
    />
  ),
  pre: ({ className, ...props }: { className?: string }) => (
    <pre
      className={cn(
        // "overflow-x-auto",
        className,
      )}
      {...props}
    />
  ),
  code: ({
    className,
    children,
  }: {
    className?: string;
    children: React.ReactNode;
  }) => {
    const match = /language-(\w+)/.exec(className || "");

    if (match) {
      const language = match[1];
      const code = String(children).replace(/\n$/, "");

      // Detect Mermaid diagrams
      if (language.toLowerCase() === "mermaid") {
        return (
          <div data-radius="radius2" className="bg-card text-card-foreground relative overflow-hidden border p-4">
            <MermaidDiagram chart={code} />
          </div>
        );
      }

      // Regular code block with syntax highlighting
      return (
        <div data-radius="radius2" className="bg-card text-card-foreground relative overflow-hidden border">
          <CodeHeader
            language={language}
            code={code}
          />
          <SyntaxHighlighter
            language={language}
            className={className}
            showLineNumbers={SHOW_CODE_LINE_NUMBERS}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      );
    }

    // Inline code => keep simple styling
    return (
      <code
        className={cn(
          "bg-muted rounded-full px-1 py-0.5 text-[0.9em] font-normal",
          className,
        )}
      >
        {children}
      </code>
    );
  },
};

const MarkdownTextImpl: FC<{ children: string; className?: string }> = ({
  children,
  className,
}) => {
  return (
    <div className={cn("markdown-content max-w-3xl", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={defaultComponents}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};

export const MarkdownText = memo(MarkdownTextImpl);
