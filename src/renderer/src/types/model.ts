/**
 * Model Types and Constants
 * 
 * Defines available LLM models for selection in chat composer
 */

export interface Model {
    id: string;
    name: string;
    provider: "openai" | "anthropic" | "google" | "custom";
    description?: string;
    contextWindow?: number;
}

/**
 * Available models for selection
 * TODO: Fetch from backend API in future
 */
export const AVAILABLE_MODELS: Model[] = [
    {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        provider: "openai",
        description: "Most capable GPT-4 model",
        contextWindow: 128000,
    },
    {
        id: "gpt-4",
        name: "GPT-4",
        provider: "openai",
        description: "Standard GPT-4 model",
        contextWindow: 8192,
    },
    {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        provider: "openai",
        description: "Fast and efficient",
        contextWindow: 16385,
    },
    {
        id: "claude-3-opus",
        name: "Claude 3 Opus",
        provider: "anthropic",
        description: "Most capable Claude model",
        contextWindow: 200000,
    },
    {
        id: "claude-3-sonnet",
        name: "Claude 3 Sonnet",
        provider: "anthropic",
        description: "Balanced performance and speed",
        contextWindow: 200000,
    },
    {
        id: "gemini-pro",
        name: "Gemini Pro",
        provider: "google",
        description: "Google's advanced model",
        contextWindow: 32000,
    },
];

/**
 * Get model by ID
 */
export function getModelById(id: string): Model | undefined {
    return AVAILABLE_MODELS.find((model) => model.id === id);
}

/**
 * Get model display name for composer
 */
export function getModelDisplayText(model: Model): string {
    return `>${model.id}`;
}
