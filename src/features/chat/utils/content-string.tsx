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

  const blocks: Array<{ heading: string; content: string }> = [];

  content
    .filter(
      (c: any) => typeof c === "object" && c !== null && c.type === "thinking",
    )
    .forEach((c: any) => {
      // The thinking content might be in 'thinking' or 'text' property
      const thinkingText = c.thinking || c.text || "";

      if (!thinkingText || thinkingText.trim().length === 0) {
        return;
      }

      // Match pattern: **Heading**\n\nContent (with multiple newlines before next heading)
      // Use regex to find all **heading** patterns
      const headingRegex = /\*\*([^*]+)\*\*/g;
      const matches = [...thinkingText.matchAll(headingRegex)];
      
      if (matches.length === 0) {
        // No headings found at all
        blocks.push({
          heading: "Thinking",
          content: thinkingText.trim().replace(/\n{3,}/g, "\n\n"),
        });
        return;
      }

      // Extract each section with its heading
      matches.forEach((match, idx) => {
        const heading = match[1].trim();
        const headingEndPos = match.index! + match[0].length;
        
        // Find content between this heading and the next (or end of text)
        const nextMatch = matches[idx + 1];
        const contentEndPos = nextMatch ? nextMatch.index! : thinkingText.length;
        
        let content = thinkingText.substring(headingEndPos, contentEndPos).trim();
        
        // Clean up content: remove leading/trailing newlines, normalize multiple newlines
        content = content.replace(/^\n+/, '').replace(/\n+$/, '').replace(/\n{3,}/g, "\n\n");
        
        if (heading) {
          blocks.push({ heading, content });
        }
      });
    });

  return blocks;
}
