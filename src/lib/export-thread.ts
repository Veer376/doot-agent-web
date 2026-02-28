/**
 * Thread Export Utilities
 *
 * Provides functions to export thread conversations in various formats:
 * - Markdown (.md) - Human-readable format with proper formatting
 * - JSON (.json) - Complete thread data for programmatic use
 * - PDF (.pdf) - Printable document format
 */

import type { Thread } from "@langchain/langgraph-sdk";
import type { Message } from "@langchain/langgraph-sdk";
import { jsPDF } from "jspdf";
import { createClient } from "@/lib/client";

// Utility to extract text content from MessageContent
const getMessageStringContent = (content: any): string => {
  if (!content) return "";
  if (typeof content === "string") return content;

  // Handle array content (e.g., [{ type: "text", text: "..." }, { type: "thinking", ... }])
  if (Array.isArray(content)) {
    const texts = content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text || "");
    return texts.join("\n");
  }

  return String(content);
};

// Format date for export
const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Get thread title
const getThreadTitle = (thread: Thread): string => {
  const customName = thread.metadata?.name as string | undefined;
  if (customName) return customName;

  // Try to get first human message
  if (thread.values && "messages" in thread.values) {
    const messages = thread.values.messages as Message[];
    const firstHuman = messages.find((m) => m.type === "human");
    if (firstHuman) {
      const content = getMessageStringContent(firstHuman.content);
      if (content) return content.slice(0, 100);
    }
  }

  return `Thread ${thread.thread_id.slice(0, 8)}`;
};

// Get messages from thread
const getMessages = (thread: Thread): Message[] => {
  if (thread.values && "messages" in thread.values) {
    return thread.values.messages as Message[];
  }
  return [];
};

// Fetch thread state with messages
// If no accessToken is provided (local thread), messages are already in thread.values
async function fetchThreadWithMessages(
  thread: Thread,
  accessToken?: string,
): Promise<Thread> {
  if (!accessToken) {
    return thread;
  }
  const client = createClient(accessToken);
  const state = await client.threads.getState(thread.thread_id);

  // Return a thread-like object with the state values
  return {
    thread_id: thread.thread_id,
    values: state.values,
    metadata: state.metadata || {},
  } as Thread;
}

/**
 * Export thread as Markdown
 */
export async function exportThreadAsMarkdown(
  thread: Thread,
  accessToken?: string,
): Promise<void> {
  // Fetch full thread state with messages (local threads already have values)
  const fullThread = await fetchThreadWithMessages(thread, accessToken);

  const title = getThreadTitle(thread); // Use original thread for title (has metadata)
  const messages = getMessages(fullThread);
  const createdAt = (thread as any).created_at || new Date().toISOString();

  let markdown = `# ${title}\n\n`;
  markdown += `**Thread ID:** ${thread.thread_id}\n`;
  markdown += `**Created:** ${formatDate(createdAt)}\n`;
  markdown += `**Messages:** ${messages.length}\n\n`;
  markdown += `---\n\n`;

  messages.forEach((message, index) => {
    const role =
      message.type === "human"
        ? "👤 User"
        : message.type === "ai"
          ? "🤖 Assistant"
          : message.type === "tool"
            ? "🔧 Tool"
            : message.type;

    const content = getMessageStringContent(message.content);

    markdown += `## ${role}\n\n`;
    markdown += `${content}\n\n`;

    // Add tool information if it's a tool message
    if (message.type === "ai" && (message as any).tool_calls) {
      const toolCalls = (message as any).tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        markdown += `**Tools Used:**\n`;
        toolCalls.forEach((tool: any) => {
          markdown += `- ${tool.name}\n`;
        });
        markdown += `\n`;
      }
    }

    if (index < messages.length - 1) {
      markdown += `---\n\n`;
    }
  });

  // Create and download file
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  downloadFile(blob, `${sanitizeFilename(title)}.md`);
}

/**
 * Export thread as JSON
 */
export async function exportThreadAsJSON(
  thread: Thread,
  accessToken?: string,
): Promise<void> {
  // Fetch full thread state with messages (local threads already have values)
  const fullThread = await fetchThreadWithMessages(thread, accessToken);

  const title = getThreadTitle(thread);
  const messages = getMessages(fullThread);

  const exportData = {
    thread_id: thread.thread_id,
    title: title,
    metadata: thread.metadata,
    created_at: (thread as any).created_at,
    updated_at: (thread as any).updated_at,
    messages: messages.map((msg) => ({
      id: msg.id,
      type: msg.type,
      content: msg.content,
      additional_kwargs: (msg as any).additional_kwargs,
      tool_calls: (msg as any).tool_calls,
      response_metadata: (msg as any).response_metadata,
    })),
    export_timestamp: new Date().toISOString(),
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  downloadFile(blob, `${sanitizeFilename(title)}.json`);
}

/**
 * Export thread as PDF
 */
export async function exportThreadAsPDF(
  thread: Thread,
  accessToken?: string,
): Promise<void> {
  // Fetch full thread state with messages (local threads already have values)
  const fullThread = await fetchThreadWithMessages(thread, accessToken);

  const title = getThreadTitle(thread);
  const messages = getMessages(fullThread);
  const createdAt = (thread as any).created_at || new Date().toISOString();

  // Create PDF
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper to add new page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Title
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  const titleLines = pdf.splitTextToSize(title, maxWidth);
  titleLines.forEach((line: string) => {
    checkPageBreak(10);
    pdf.text(line, margin, yPosition);
    yPosition += 10;
  });
  yPosition += 5;

  // Metadata
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Thread ID: ${thread.thread_id}`, margin, yPosition);
  yPosition += 6;
  pdf.text(`Created: ${formatDate(createdAt)}`, margin, yPosition);
  yPosition += 6;
  pdf.text(`Messages: ${messages.length}`, margin, yPosition);
  yPosition += 10;

  // Separator
  pdf.setDrawColor(200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Messages
  messages.forEach((message, index) => {
    const role =
      message.type === "human"
        ? "User"
        : message.type === "ai"
          ? "Assistant"
          : message.type === "tool"
            ? "Tool"
            : message.type;

    const content = getMessageStringContent(message.content);

    // Role header
    checkPageBreak(15);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(role, margin, yPosition);
    yPosition += 8;

    // Content
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const contentLines = pdf.splitTextToSize(content || "(empty)", maxWidth);

    contentLines.forEach((line: string) => {
      checkPageBreak(6);
      pdf.text(line, margin, yPosition);
      yPosition += 6;
    });

    yPosition += 8;

    // Separator between messages
    if (index < messages.length - 1) {
      checkPageBreak(5);
      pdf.setDrawColor(230);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
    }
  });

  // Save PDF
  pdf.save(`${sanitizeFilename(title)}.pdf`);
}

/**
 * Sanitize filename for safe file system use
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase()
    .slice(0, 100);
}

/**
 * Download a blob as a file
 */
function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
