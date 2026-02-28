/**
 * Tool Call Type Definitions
 * 
 * Type-safe interfaces for AI tool calls and responses.
 */

// ToolMessage import removed - ToolResponse is now standalone to avoid SDK type conflicts

// Tool call status
export type ToolCallStatus = 'pending' | 'success' | 'error';

// Tool call arguments - generic structure
export interface ToolCallArguments {
    [key: string]: unknown;
}

// Tool call structure
export interface ToolCall {
    id: string;
    name: string;
    args: ToolCallArguments;
    type?: 'tool_call';
}

// Tool response structure (standalone, not extending ToolMessage to avoid SDK type conflicts)
export interface ToolResponse {
    tool_call_id: string;
    content: string | Record<string, unknown>;
    type: 'tool';
    id?: string;
    name?: string;
}

// Step types for chain of thought
export interface ThinkingStep {
    type: 'thinking';
    heading: string;
    content: string;
}

export interface ToolStep {
    type: 'tool';
    toolCall: ToolCall;
    toolResponse?: ToolResponse;
    status: ToolCallStatus;
}

export type ChainOfThoughtStep = ThinkingStep | ToolStep;

// Type guards
export function isToolCall(obj: unknown): obj is ToolCall {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'name' in obj &&
        'args' in obj
    );
}

export function isToolResponse(obj: unknown): obj is ToolResponse {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'type' in obj &&
        obj.type === 'tool' &&
        'tool_call_id' in obj
    );
}

export function isThinkingStep(step: ChainOfThoughtStep): step is ThinkingStep {
    return step.type === 'thinking';
}

export function isToolStep(step: ChainOfThoughtStep): step is ToolStep {
    return step.type === 'tool';
}
