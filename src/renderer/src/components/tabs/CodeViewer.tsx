"use client";

import { useMemo, useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { codeToHtml, type BundledLanguage } from "shiki";

interface CodeViewerProps {
  filePath: string;
  content: string;
}

// Map file extensions to shiki language identifiers
const EXT_TO_LANG: Record<string, BundledLanguage> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  json: "json",
  jsonc: "jsonc",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  html: "html",
  htm: "html",
  md: "markdown",
  mdx: "mdx",
  yaml: "yaml",
  yml: "yaml",
  sh: "bash",
  bash: "bash",
  zsh: "zsh",
  sql: "sql",
  xml: "xml",
  svg: "xml",
  graphql: "graphql",
  gql: "graphql",
  rs: "rust",
  go: "go",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
  cs: "csharp",
  rb: "ruby",
  php: "php",
  vue: "vue",
  svelte: "svelte",
  astro: "astro",
  dockerfile: "dockerfile",
  makefile: "makefile",
  toml: "toml",
  ini: "ini",
  env: "dotenv",
};

// Map file extensions to language display names
function getLanguageDisplay(ext: string | undefined): string {
  const langMap: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TypeScript (React)",
    js: "JavaScript",
    jsx: "JavaScript (React)",
    mjs: "JavaScript (ES Module)",
    cjs: "JavaScript (CommonJS)",
    py: "Python",
    json: "JSON",
    css: "CSS",
    scss: "SCSS",
    html: "HTML",
    htm: "HTML",
    md: "Markdown",
    mdx: "MDX",
    yaml: "YAML",
    yml: "YAML",
    sh: "Shell",
    bash: "Bash",
    zsh: "Zsh",
    sql: "SQL",
    xml: "XML",
    txt: "Plain Text",
    rs: "Rust",
    go: "Go",
    java: "Java",
    kt: "Kotlin",
    swift: "Swift",
    c: "C",
    cpp: "C++",
    cs: "C#",
    rb: "Ruby",
    php: "PHP",
    vue: "Vue",
    svelte: "Svelte",
  };

  return ext ? langMap[ext] || ext.toUpperCase() : "Plain Text";
}

export function CodeViewer({ filePath, content }: CodeViewerProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get file extension for display
  const fileName = filePath.split("/").pop() || filePath;
  const ext = fileName.includes(".")
    ? fileName.split(".").pop()?.toLowerCase()
    : undefined;
  const language = useMemo(() => getLanguageDisplay(ext), [ext]);
  const shikiLang = ext ? EXT_TO_LANG[ext] : undefined;

  const lineCount = content?.split("\n").length ?? 0;
  const lines = content?.split("\n") ?? [];

  // Highlight code with shiki
  useEffect(() => {
    let cancelled = false;

    async function highlight() {
      setIsLoading(true);
      try {
        const html = await codeToHtml(content || "", {
          lang: shikiLang || "text",
          themes: {
            light: "github-light",
            dark: "github-dark",
          },
        });
        if (!cancelled) {
          setHighlightedHtml(html);
        }
      } catch (err) {
        console.error("Shiki highlighting failed:", err);
        if (!cancelled) {
          setHighlightedHtml(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    highlight();
    return () => {
      cancelled = true;
    };
  }, [content, shikiLang]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* File path header */}
      <div className="bg-background/50 flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
        <span className="truncate">{filePath}</span>
        <span className="text-muted-foreground/50">•</span>
        <span>{lineCount} lines</span>
        <span className="text-muted-foreground/50">•</span>
        <span className="text-muted-foreground/70">{language}</span>
      </div>

      {/* File content with syntax highlighting and line numbers */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <span className="animate-pulse">Loading...</span>
            </div>
          ) : (
            <div className="flex text-sm">
              {/* Line numbers column */}
              <div className="border-border/50 bg-muted/30 shrink-0 select-none border-r py-4 pl-4 pr-2 text-right">
                {lines.map((_, i) => (
                  <div
                    key={i}
                    className="text-muted-foreground/50 font-mono text-xs leading-6"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Code content */}
              <div className="min-w-0 flex-1 overflow-x-auto">
                {highlightedHtml ? (
                  <div
                    className="shiki-container px-4 py-4 [&_.line]:leading-6 [&_.shiki]:!bg-transparent [&_code]:!bg-transparent [&_pre]:!m-0 [&_pre]:!bg-transparent"
                    dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                  />
                ) : (
                  <pre className="whitespace-pre px-4 py-4 font-mono">
                    {lines.map((line, i) => (
                      <div
                        key={i}
                        className="leading-6"
                      >
                        {line || " "}
                      </div>
                    ))}
                  </pre>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
