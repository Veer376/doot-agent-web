/**
 * Message Content Type Definitions
 * 
 * Type-safe interfaces for LangChain message content structures.
 */

import type { MessageContent } from '@langchain/core/messages';

// Base content block types
export interface TextContentBlock {
    type: 'text';
    text: string;
}

export interface ImageContentBlock {
    type: 'image';
    image_url: string | { url: string };
}

export interface ThinkingContentBlock {
    type: 'thinking';
    thinking: string;
}

export interface ToolUseContentBlock {
    type: 'tool_use';
    id: string;
    name: string;
    input: Record<string, unknown>;
}

// Union type for all content blocks
export type MessageContentBlock =
    | TextContentBlock
    | ImageContentBlock
    | ThinkingContentBlock
    | ToolUseContentBlock;

// Type guard functions
export function isTextContent(block: unknown): block is TextContentBlock {
    return (
        typeof block === 'object' &&
        block !== null &&
        'type' in block &&
        block.type === 'text'
    );
}

export function isImageContent(block: unknown): block is ImageContentBlock {
    return (
        typeof block === 'object' &&
        block !== null &&
        'type' in block &&
        block.type === 'image'
    );
}

export function isThinkingContent(block: unknown): block is ThinkingContentBlock {
    return (
        typeof block === 'object' &&
        block !== null &&
        'type' in block &&
        block.type === 'thinking'
    );
}

export function isToolUseContent(block: unknown): block is ToolUseContentBlock {
    return (
        typeof block === 'object' &&
        block !== null &&
        'type' in block &&
        block.type === 'tool_use'
    );
}

// Helper to extract text from message content
export function getTextFromContent(content: MessageContent | undefined): string {
    if (!content) return '';
    if (typeof content === 'string') return content;

    const textBlocks = content.filter(isTextContent);
    return textBlocks.map(block => block.text).join(' ');
}
