/**
 * Slash Command Parser
 * 
 * Parses textarea input for slash commands (e.g., ">model", "/search")
 * Can be extended to support other commands in the future
 */

export interface SlashCommand {
    type: "model" | "toolkit" | "none";
    trigger: string; // ">" or "/"
    query: string; // text after trigger
    cursorPosition: number;
    replaceStart: number;
    replaceEnd: number;
}

/**
 * Parses textarea input for slash commands at cursor position
 * 
 * @param text - Full textarea text
 * @param cursorPosition - Current cursor position
 * @returns SlashCommand if found, null otherwise
 * 
 * @example
 * parseSlashCommand("Hello >gpt", 10) // { type: "model", query: "gpt", ... }
 * parseSlashCommand("Hello /play", 11) // { type: "toolkit", query: "play", ... }
 * parseSlashCommand("Hello world", 5) // null
 */
export function parseSlashCommand(
    text: string,
    cursorPosition: number
): SlashCommand | null {
    // Find command trigger before cursor
    const beforeCursor = text.slice(0, cursorPosition);

    // Check for "/" at start of line or after whitespace/newline
    // Pattern: (start|whitespace)(/)(query)
    const toolsMatch = beforeCursor.match(/(^|\s|\n)(\/)(\S*)$/);

    if (toolsMatch) {
        const [fullMatch, whitespace, trigger, query] = toolsMatch;
        const replaceStart = beforeCursor.length - fullMatch.length + whitespace.length;

        return {
            type: "toolkit",
            trigger,
            query: query || "",
            cursorPosition,
            replaceStart,
            replaceEnd: cursorPosition,
        };
    }

    // Check for ">" at start of line or after whitespace/newline
    // Pattern: (start|whitespace)(>)(query)
    const modelMatch = beforeCursor.match(/(^|\s|\n)(>)(\S*)$/);

    if (!modelMatch) return null;

    const [fullMatch, whitespace, trigger, query] = modelMatch;
    const replaceStart = beforeCursor.length - fullMatch.length + whitespace.length;

    return {
        type: "model",
        trigger,
        query,
        cursorPosition,
        replaceStart,
        replaceEnd: cursorPosition,
    };
}

/**
 * Replaces command in text with selected value
 * 
 * @param text - Full textarea text
 * @param command - Parsed command to replace
 * @param replacement - Replacement text (e.g., ">gpt-4-turbo ")
 * @returns New text and cursor position
 * 
 * @example
 * replaceCommand("Hello >gp", command, ">gpt-4 ")
 * // { newText: "Hello >gpt-4 ", newCursorPosition: 14 }
 */
export function replaceCommand(
    text: string,
    command: SlashCommand,
    replacement: string
): { newText: string; newCursorPosition: number } {
    const before = text.slice(0, command.replaceStart);
    const after = text.slice(command.replaceEnd);
    const newText = `${before}${replacement}${after}`;
    const newCursorPosition = before.length + replacement.length;

    return { newText, newCursorPosition };
}


