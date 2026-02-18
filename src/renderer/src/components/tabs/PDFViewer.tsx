"use client";

import { FileText, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface PDFViewerProps {
  filePath: string;
  base64Content: string;
}

export function PDFViewer({
  filePath,
  base64Content,
}: PDFViewerProps): React.JSX.Element {
  const fileName = filePath.split("/").pop() || filePath;
  const pdfUrl = `data:application/pdf;base64,${base64Content}`;

  const handleOpenExternal = (): void => {
    // Open in system default PDF viewer
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = fileName;
    link.click();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-background/50 flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 overflow-hidden text-xs text-muted-foreground">
          <span className="truncate">{fileName}</span>
          <span className="text-muted-foreground/50">•</span>
          <span>PDF Document</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenExternal}
          className="h-7 gap-1 px-2"
        >
          <ExternalLink className="size-3" />
          <span className="text-xs">Download</span>
        </Button>
      </div>

      {/* PDF embed */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="bg-muted/30 flex min-h-full flex-col items-center">
          <object
            data={pdfUrl}
            type="application/pdf"
            className="h-full min-h-[600px] w-full"
          >
            {/* Fallback if PDF can't be displayed inline */}
            <div className="flex min-h-[600px] flex-col items-center justify-center gap-4 p-8">
              <FileText className="text-muted-foreground/50 size-16" />
              <div className="text-center">
                <div className="mb-2 font-medium text-foreground">
                  {fileName}
                </div>
                <div className="mb-4 text-sm text-muted-foreground">
                  PDF preview not available in this browser
                </div>
                <Button
                  onClick={handleOpenExternal}
                  variant="outline"
                >
                  <ExternalLink className="mr-2 size-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          </object>
        </div>
      </ScrollArea>
    </div>
  );
}
