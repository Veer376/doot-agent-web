import type { Message } from "@langchain/langgraph-sdk";

/**
 * Returns the content of a message as a string.
 *
 * @param content - The content of the message
 * @returns The content of the message as a string
 */
export function getContentString(content: Message["content"]): string {
  if (typeof content === "string") return content;
  const texts = content
    .filter((c: any) => {
      // Handle plain strings in the array
      if (typeof c === "string") return true;
      // Handle objects with type: "text"
      return typeof c === "object" && c !== null && c.type === "text";
    })
    .map((c: any) => {
      // If it's a string, return it directly
      if (typeof c === "string") return c;
      // If it's an object, extract the text property
      return c.text || "";
    });
  return texts.join(" ");
}

/**
 * Extracts thinking blocks from message content with heading and content separation
 *
 * @param content - The content of the message
 * @returns Array of thinking blocks with heading and content
 */
export function getThinkingBlocks(
  content: Message["content"],
): Array<{ heading: string; content: string }> {
  if (typeof content === "string") return [];

  return content
    .filter(
      (c: any) => typeof c === "object" && c !== null && c.type === "thinking",
    )
    .map((c: any) => {
      // The thinking content might be in 'thinking' or 'text' property
      const thinkingText = c.thinking || c.text || "";

      if (!thinkingText || thinkingText.trim().length === 0) {
        return null;
      }

      // Split into lines and find heading
      const lines = thinkingText.trim().split("\n");
      let heading = "Thinking";
      let content = thinkingText.trim();

      // Check if first line is a bold heading **...**
      const firstLine = lines[0]?.trim();
      if (firstLine) {
        const boldMatch = firstLine.match(/^\*\*(.+?)\*\*$/);
        if (boldMatch) {
          // Extract heading and remove it from content
          heading = boldMatch[1].trim();
          content = lines.slice(1).join("\n").trim();
        }
      }

      // Remove extra newlines (replace multiple newlines with double newline)
      content = content.replace(/\n{3,}/g, "\n\n").trim();

      return { heading, content };
    })
    .filter(
      (block): block is { heading: string; content: string } => block !== null,
    );
}
