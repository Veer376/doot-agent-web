"use client";
import SyntaxHighlighterPrism from "react-syntax-highlighter/dist/esm/prism-async-light";
// Core/common langs already used
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
// Popular additional languages
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import dart from "react-syntax-highlighter/dist/esm/languages/prism/dart";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import kotlin from "react-syntax-highlighter/dist/esm/languages/prism/kotlin";
import csharp from "react-syntax-highlighter/dist/esm/languages/prism/csharp";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import c from "react-syntax-highlighter/dist/esm/languages/prism/c";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup"; // HTML/XML
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import scss from "react-syntax-highlighter/dist/esm/languages/prism/scss";
import graphql from "react-syntax-highlighter/dist/esm/languages/prism/graphql";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import ruby from "react-syntax-highlighter/dist/esm/languages/prism/ruby";
import php from "react-syntax-highlighter/dist/esm/languages/prism/php";
import docker from "react-syntax-highlighter/dist/esm/languages/prism/docker";
import toml from "react-syntax-highlighter/dist/esm/languages/prism/toml";
import ini from "react-syntax-highlighter/dist/esm/languages/prism/ini";
import coldarkDark from "react-syntax-highlighter/dist/esm/styles/prism/coldark-dark";
import coldarkCold from "react-syntax-highlighter/dist/esm/styles/prism/coldark-cold";
import { FC } from "react";
import { useTheme } from "next-themes";

// Register languages you want to support
// JavaScript/TypeScript
SyntaxHighlighterPrism.registerLanguage("js", tsx);
SyntaxHighlighterPrism.registerLanguage("jsx", tsx);
SyntaxHighlighterPrism.registerLanguage("ts", tsx);
SyntaxHighlighterPrism.registerLanguage("tsx", tsx);
SyntaxHighlighterPrism.registerLanguage("javascript", tsx);
SyntaxHighlighterPrism.registerLanguage("typescript", tsx);

// Python (+ alias)
SyntaxHighlighterPrism.registerLanguage("python", python);
SyntaxHighlighterPrism.registerLanguage("py", python);

// Web: HTML/XML, CSS
SyntaxHighlighterPrism.registerLanguage("markup", markup);
SyntaxHighlighterPrism.registerLanguage("html", markup);
SyntaxHighlighterPrism.registerLanguage("xml", markup);
SyntaxHighlighterPrism.registerLanguage("css", css);
SyntaxHighlighterPrism.registerLanguage("scss", scss);

// Data/markup formats
SyntaxHighlighterPrism.registerLanguage("json", json);
SyntaxHighlighterPrism.registerLanguage("yaml", yaml);
SyntaxHighlighterPrism.registerLanguage("yml", yaml);
SyntaxHighlighterPrism.registerLanguage("markdown", markdown);
SyntaxHighlighterPrism.registerLanguage("md", markdown);
SyntaxHighlighterPrism.registerLanguage("toml", toml);
SyntaxHighlighterPrism.registerLanguage("ini", ini);

// Scripting / shell
SyntaxHighlighterPrism.registerLanguage("bash", bash);
SyntaxHighlighterPrism.registerLanguage("shell", bash);
SyntaxHighlighterPrism.registerLanguage("sh", bash);

// Systems / compiled languages
SyntaxHighlighterPrism.registerLanguage("c", c);
SyntaxHighlighterPrism.registerLanguage("cpp", cpp);
SyntaxHighlighterPrism.registerLanguage("csharp", csharp);
SyntaxHighlighterPrism.registerLanguage("cs", csharp);
SyntaxHighlighterPrism.registerLanguage("java", java);
SyntaxHighlighterPrism.registerLanguage("kotlin", kotlin);
SyntaxHighlighterPrism.registerLanguage("go", go);
SyntaxHighlighterPrism.registerLanguage("rust", rust);

// Mobile / app
SyntaxHighlighterPrism.registerLanguage("dart", dart); // Flutter uses Dart

// Backend / DB / API
SyntaxHighlighterPrism.registerLanguage("graphql", graphql);
SyntaxHighlighterPrism.registerLanguage("sql", sql);

// Other popular languages
SyntaxHighlighterPrism.registerLanguage("ruby", ruby);
SyntaxHighlighterPrism.registerLanguage("php", php);
SyntaxHighlighterPrism.registerLanguage("docker", docker);

export interface SyntaxHighlighterProps {
  children: string;
  language: string;
  className?: string;
  showLineNumbers?: boolean;
}

export const SyntaxHighlighter: FC<SyntaxHighlighterProps> = ({
  children,
  language,
  className,
  showLineNumbers = false,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <SyntaxHighlighterPrism
      language={language}
      style={isDark ? coldarkDark : coldarkCold}
      showLineNumbers={showLineNumbers}
      lineNumberStyle={{
        fontSize: "0.7rem",
        paddingRight: "0.875rem",
        opacity: 0.42,
        color: "var(--doot-text-tertiary)",
      }}
      lineNumberContainerStyle={{
        position: "relative",
        zIndex: 1,
      }}
      customStyle={{
        margin: 0,
        width: "100%",
        maxWidth: "100%",
        overflowX: "auto",
        background: "transparent",
        padding: "0.875rem 1rem 1rem",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--doot-code-font-size)",
        lineHeight: "var(--doot-code-line-height)",
        tabSize: 2,
        overscrollBehaviorX: "contain",
      }}
      className={className}
    >
      {children}
    </SyntaxHighlighterPrism>
  );
};
