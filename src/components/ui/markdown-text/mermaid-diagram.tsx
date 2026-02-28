"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "next-themes";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({
  chart,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const uniqueId = useId();

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;

      try {
        // Dynamically import mermaid only when needed
        const mermaid = (await import("mermaid")).default;

        // Initialize mermaid with theme
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          securityLevel: "loose",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        });

        // Clear previous content
        containerRef.current.innerHTML = "";

        // Generate unique ID for this diagram using React's useId
        const id = `mermaid-${uniqueId.replace(/:/g, "-")}`;

        // Render the diagram
        const { svg } = await mermaid.render(id, chart);
        containerRef.current.innerHTML = svg;
        setError(null);
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to render diagram",
        );
      }
    };

    renderDiagram();
  }, [chart, isDark]);

  if (error) {
    return (
      <div className={className}>
        <div
          data-radius="radius"
          className="border border-red-500/20 bg-red-500/10 p-4"
        >
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to render diagram: {error}
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-red-600/70 dark:text-red-400/70">
              Show diagram code
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-black/10 p-2 text-xs dark:bg-white/10">
              {chart}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "1rem",
      }}
    />
  );
};
