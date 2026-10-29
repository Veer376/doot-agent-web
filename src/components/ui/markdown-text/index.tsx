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
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationSource,
} from "@/components/ai-elements/inline-citation";

import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { cn } from "@/lib/utils";

import "katex/dist/katex.min.css";

interface Citation {
  number: string;
  title: string;
  url: string;
  description?: string;
}

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

const TableCopyWrapper: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    if (!wrapperRef.current) return;
    const rows = wrapperRef.current.querySelectorAll("tr");
    const text = Array.from(rows)
      .map((row) =>
        Array.from(row.querySelectorAll("th,td"))
          .map((cell) => cell.textContent ?? "")
          .join("\t"),
      )
      .join("\n");
    copyToClipboard(text);
  };

  return (
    <div
      ref={wrapperRef}
      className="doot-table-wrap group/table relative"
    >
      <div className="doot-table-toolbar">
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy table"
          className="doot-rich-copy flex items-center gap-1.5"
        >
          {isCopied ? <CheckmarkCircleIcon size="xs" /> : <CopyIcon size="xs" />}
          {isCopied ? "Copied" : "Copy"}
        </button>
      </div>
      {children}
    </div>
  );
};

const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  return (
    <div className="doot-code-header sticky top-0 z-10 flex items-center justify-between gap-3">
      <span className="doot-code-language lowercase">
        {language}
      </span>
      <TooltipIconButton
        tooltip="Copy"
        onClick={onCopy}
        className="doot-code-copy relative z-10"
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
    citations,
    ...props
  }: {
    className?: string;
    children: any;
    citations?: Map<string, Citation>;
  }) => {
    // Citation processing function - now shared
    const processChildrenForCitations = (
      children: any,
      citations?: Map<string, Citation>,
    ): any => {
      if (!citations || citations.size === 0) {
        return children;
      }

      if (typeof children === "string") {
        const parts = children.split(/(\[\d+(?:\s*,\s*\d+)*\])/g);

        return parts.map((part: string, index: number) => {
          const citationMatch = part.match(/\[(\d+(?:\s*,\s*\d+)*)\]/);

          if (citationMatch) {
            const numbers = citationMatch[1]
              .split(",")
              .map((n: string) => n.trim());
            const citationsForThis = numbers
              .map((num) => citations.get(num))
              .filter((c): c is Citation => c !== undefined);

            if (citationsForThis.length === 0) {
              return <span key={index}>{part}</span>;
            }

            return (
              <InlineCitation key={index}>
                <InlineCitationCard>
                  <InlineCitationCardTrigger
                    sources={citationsForThis.map((c) => c.url)}
                  />
                  <InlineCitationCardBody>
                    <InlineCitationCarousel>
                      <InlineCitationCarouselHeader>
                        <InlineCitationCarouselPrev />
                        <InlineCitationCarouselNext />
                        <InlineCitationCarouselIndex />
                      </InlineCitationCarouselHeader>
                      <InlineCitationCarouselContent>
                        {citationsForThis.map((citation) => (
                          <InlineCitationCarouselItem key={citation.url}>
                            <InlineCitationSource
                              title={citation.title}
                              url={citation.url}
                              description={citation.description}
                            />
                          </InlineCitationCarouselItem>
                        ))}
                      </InlineCitationCarouselContent>
                    </InlineCitationCarousel>
                  </InlineCitationCardBody>
                </InlineCitationCard>
              </InlineCitation>
            );
          }

          return part;
        });
      }

      if (Array.isArray(children)) {
        return children.map((child) =>
          processChildrenForCitations(child, citations),
        );
      }

      return children;
    };

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
          className={cn("doot-markdown-paragraph", className)}
          {...props}
        >
          {processChildrenForCitations(children, citations)}
        </p>
      );
    }

    const labelKey = match[1].toLowerCase();
    const labelMap: Record<string, { wrapper: string; label: string }> = {
      note: {
        wrapper:
          "my-4 rounded-lg border-semantic-warning/40 bg-semantic-warning-light text-semantic-warning",
        label: "font-semibold text-semantic-warning",
      },
      tip: {
        wrapper:
          "my-4 rounded-lg border-semantic-success/40 bg-semantic-success-light text-semantic-success",
        label: "font-semibold text-semantic-success",
      },
      info: {
        wrapper:
          "my-4 rounded-lg border-semantic-info/40 bg-semantic-info-light text-semantic-info",
        label: "font-semibold text-semantic-info",
      },
      warning: {
        wrapper:
          "my-4 rounded-lg border-semantic-warning/40 bg-semantic-warning-light text-semantic-warning",
        label: "font-semibold text-semantic-warning",
      },
      important: {
        wrapper:
          "my-4 rounded-lg border-destructive/40 bg-destructive/10 text-destructive",
        label: "font-semibold text-destructive",
      },
      caution: {
        wrapper:
          "my-4 rounded-lg border-semantic-warning/40 bg-semantic-warning-light text-semantic-warning",
        label: "font-semibold text-semantic-warning",
      },
      todo: {
        wrapper:
          "my-4 rounded-lg border-primary/40 bg-primary/10 text-primary",
        label: "font-semibold text-primary",
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
          className="text-semantic-warning"
        />
      ),
      tip: (
        <TipIcon
          size="xs"
          className="text-semantic-success"
        />
      ),
      info: (
        <InfoIcon
          size="xs"
          className="text-semantic-info"
        />
      ),
      warning: (
        <WarningIcon
          size="xs"
          className="text-semantic-warning"
        />
      ),
      important: (
        <ImportantIcon
          size="xs"
          className="text-destructive"
        />
      ),
      caution: (
        <WarningIcon
          size="xs"
          className="text-semantic-warning"
        />
      ),
      todo: (
        <TodoIcon
          size="xs"
          className="text-primary"
        />
      ),
    };
    // Badge border colors to blend with wrapper border for each callout type
    const badgeBorderMap: Record<string, string> = {
      note: "border-semantic-warning/40",
      tip: "border-semantic-success/40",
      info: "border-semantic-info/40",
      warning: "border-semantic-warning/40",
      important: "border-destructive/40",
      caution: "border-semantic-warning/40",
      todo: "border-primary/40",
    };
    const labelText =
      match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();

    return (
      <>
        {/* Consistency in padding and margin whatever */}
        <div className={cn(wrapper, "doot-callout relative px-3 py-2.5")}>
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
        "doot-markdown-heading doot-markdown-h1 scroll-m-20",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }: { className?: string }) => (
    <h2
      className={cn(
        "doot-markdown-heading doot-markdown-h2 scroll-m-20",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: { className?: string }) => (
    <h3
      className={cn(
        "doot-markdown-heading doot-markdown-h3 scroll-m-20",
        className,
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }: { className?: string }) => (
    <h4
      className={cn(
        "doot-markdown-heading doot-markdown-h4 scroll-m-20",
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
      className={cn("doot-markdown-link", className)}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  blockquote: ({ className, ...props }: { className?: string }) => (
    <blockquote
      className={cn("doot-blockquote", className)}
      {...props}
    />
  ),
  ul: ({ className, ...props }: { className?: string }) => (
    <ul
      className={cn("doot-markdown-list list-disc", className)}
      {...props}
    />
  ),
  ol: ({ className, ...props }: { className?: string }) => (
    <ol
      className={cn("doot-markdown-list list-decimal", className)}
      {...props}
    />
  ),
  li: ({
    className,
    children,
    citations,
    ...props
  }: {
    className?: string;
    children: any;
    citations?: Map<string, Citation>;
  }) => {
    // Reuse the same citation processing function from p component
    const processChildrenForCitations = (
      children: any,
      citations?: Map<string, Citation>,
    ): any => {
      if (!citations || citations.size === 0) {
        return children;
      }

      if (typeof children === "string") {
        const parts = children.split(/(\[\d+(?:\s*,\s*\d+)*\])/g);

        return parts.map((part: string, index: number) => {
          const citationMatch = part.match(/\[(\d+(?:\s*,\s*\d+)*)\]/);

          if (citationMatch) {
            const numbers = citationMatch[1]
              .split(",")
              .map((n: string) => n.trim());
            const citationsForThis = numbers
              .map((num) => citations.get(num))
              .filter((c): c is Citation => c !== undefined);

            if (citationsForThis.length === 0) {
              return <span key={index}>{part}</span>;
            }

            return (
              <InlineCitation key={index}>
                <InlineCitationCard>
                  <InlineCitationCardTrigger
                    sources={citationsForThis.map((c) => c.url)}
                  />
                  <InlineCitationCardBody>
                    <InlineCitationCarousel>
                      <InlineCitationCarouselHeader>
                        <InlineCitationCarouselPrev />
                        <InlineCitationCarouselNext />
                        <InlineCitationCarouselIndex />
                      </InlineCitationCarouselHeader>
                      <InlineCitationCarouselContent>
                        {citationsForThis.map((citation) => (
                          <InlineCitationCarouselItem key={citation.url}>
                            <InlineCitationSource
                              title={citation.title}
                              url={citation.url}
                              description={citation.description}
                            />
                          </InlineCitationCarouselItem>
                        ))}
                      </InlineCitationCarouselContent>
                    </InlineCitationCarousel>
                  </InlineCitationCardBody>
                </InlineCitationCard>
              </InlineCitation>
            );
          }

          return part;
        });
      }

      if (Array.isArray(children)) {
        return children.map((child) =>
          processChildrenForCitations(child, citations),
        );
      }

      return children;
    };

    return (
      <li
        className={className}
        {...props}
      >
        {processChildrenForCitations(children, citations)}
      </li>
    );
  },
  hr: ({ className, ...props }: { className?: string }) => (
    <hr
      className={cn("doot-markdown-hr", className)}
      {...props}
    />
  ),
  img: ({
    className,
    alt = "",
    ...props
  }: {
    className?: string;
    alt?: string;
  }) => (
    <img
      className={cn("doot-markdown-image", className)}
      alt={alt}
      loading="lazy"
      {...props}
    />
  ),
  table: ({ className, ...props }: { className?: string }) => (
    <TableCopyWrapper>
      <div
        className="doot-table w-full overflow-x-auto"
      >
        <table
          className={cn("doot-table-element w-full border-collapse", className)}
          {...props}
        />
      </div>
    </TableCopyWrapper>
  ),
  th: ({ className, ...props }: { className?: string }) => (
    <th
      className={cn(
        "doot-table-head text-left last:border-r-0 [&[align=center]]:text-center [&[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: { className?: string }) => (
    <td
      className={cn(
        "doot-table-cell last:border-r-0 [&[align=center]]:text-center [&[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),
  tr: ({ className, ...props }: { className?: string }) => (
    <tr
      className={cn(
        "doot-table-row last:[&>td]:border-b-0",
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
      className={cn("doot-pre min-w-0 max-w-full", className)}
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
          <div
            className="doot-rich-card doot-mermaid-card relative overflow-hidden"
          >
            <MermaidDiagram chart={code} />
          </div>
        );
      }

      // Regular code block with syntax highlighting
      return (
        <div
          className="doot-code-block relative"
        >
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
          "doot-inline-code rounded-md px-1.5 py-0.5 text-[0.9em] font-normal",
          className,
        )}
      >
        {children}
      </code>
    );
  },
};

const MarkdownTextImpl: FC<{
  children: string;
  className?: string;
  citations?: Map<string, Citation>;
}> = ({ children, className, citations: externalCitations }) => {
  // Parse citations from the content
  const parseCitations = (text: string): Map<string, Citation> => {
    const citations = new Map<string, Citation>();

    const sourcesMatch = text.match(/\*\*Sources:\*\*\s*\n([\s\S]+?)$/i);
    if (!sourcesMatch) return citations;

    const sourcesList = sourcesMatch[1];
    const citationLines = sourcesList
      .split(/(?=\n\[\d+\])/g)
      .filter((line) => line.trim());

    citationLines.forEach((line) => {
      const trimmedLine = line.trim();
      // Match: [number] Title | URL | Description
      // Uses pipe (|) as delimiter to avoid conflicts with hyphens in titles
      // Allows optional space after opening bracket: [ 1] or [1]
      // Format: [1] Title | https://url | Optional description
      const match = trimmedLine.match(
        /^\[\s*(\d+)\s*\]\s*(.+?)\s*\|\s*(https?:\/\/\S+)(?:\s*\|\s*(.+))?$/,
      );

      if (match) {
        const [, number, title, url, description] = match;
        citations.set(number.trim(), {
          number: number.trim(),
          title: title.trim(),
          url: url.trim(),
          description: description?.trim(),
        });
      }
    });

    return citations;
  };

  const removeSources = (text: string): string => {
    return text.replace(/\n*\*\*Sources:\*\*\s*\n[\s\S]+?$/i, "");
  };

  const citations = externalCitations || parseCitations(children);
  const content = citations.size > 0 ? removeSources(children) : children;

  // Create components with citations injected
  const componentsWithCitations = {
    ...defaultComponents,
    p: (props: any) => defaultComponents.p({ ...props, citations }),
    li: (props: any) => defaultComponents.li({ ...props, citations }),
  };

  return (
    <div className={cn("doot-markdown markdown-content w-full min-w-0", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={componentsWithCitations}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export const MarkdownText = memo(MarkdownTextImpl);
