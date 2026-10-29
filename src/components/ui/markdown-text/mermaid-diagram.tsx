"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { LoaderIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

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
  const [isRendering, setIsRendering] = useState(true);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const uniqueId = useId();

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      if (!containerRef.current) return;
      setIsRendering(true);
      setError(null);

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
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = svg;
        setError(null);
        setIsRendering(false);
      } catch (err) {
        if (cancelled) return;
        console.error("Mermaid rendering error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to render diagram",
        );
        setIsRendering(false);
      }
    };

    void renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [chart, isDark]);

  if (error) {
    return (
      <div className={cn("doot-mermaid-error p-4", className)}>
        <div
          role="alert"
          className="text-sm"
        >
          <p>
            Failed to render diagram: {error}
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs opacity-75">
              Show diagram code
            </summary>
            <pre className="mt-2 max-w-full overflow-auto rounded-md bg-muted/60 p-2 text-xs">
              {chart}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("doot-mermaid", className)}
      aria-busy={isRendering}
      aria-label="Diagram"
    >
      {isRendering && (
        <div className="doot-mermaid-loading">
          <LoaderIcon
            size="xs"
            className="animate-spin"
          />
          <span>Rendering diagram…</span>
        </div>
      )}
      <div
        ref={containerRef}
        className={cn(
          "doot-mermaid-render-target",
          isRendering && "invisible",
        )}
      />
    </div>
  );
};
