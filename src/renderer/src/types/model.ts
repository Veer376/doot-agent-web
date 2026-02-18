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
 * 
 * Model IDs use the `provider:model` format for explicit provider detection.
 * This ensures the API key management system can correctly identify which
 * API key is needed when a model is selected.
 */
export const AVAILABLE_MODELS: Model[] = [
    // Google Models
    {
        id: "google:gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        provider: "google",
        description: "Most capable Gemini model with extended thinking",
        contextWindow: 1000000,
    },
    {
        id: "google:gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        provider: "google",
        description: "Fast and efficient Gemini model",
        contextWindow: 1000000,
    },
    // Anthropic Models
    {
        id: "anthropic:claude-sonnet-4-20250514",
        name: "Claude Sonnet 4",
        provider: "anthropic",
        description: "Latest Claude Sonnet model",
        contextWindow: 200000,
    },
    {
        id: "anthropic:claude-3-5-sonnet-latest",
        name: "Claude 3.5 Sonnet",
        provider: "anthropic",
        description: "Balanced performance and speed",
        contextWindow: 200000,
    },
    {
        id: "anthropic:claude-3-opus-20240229",
        name: "Claude 3 Opus",
        provider: "anthropic",
        description: "Most capable Claude model",
        contextWindow: 200000,
    },
    // OpenAI Models
    {
        id: "openai:gpt-4o",
        name: "GPT-4o",
        provider: "openai",
        description: "Omni model with vision and audio",
        contextWindow: 128000,
    },
    {
        id: "openai:gpt-4-turbo",
        name: "GPT-4 Turbo",
        provider: "openai",
        description: "Fast GPT-4 with large context",
        contextWindow: 128000,
    },
    {
        id: "openai:o1",
        name: "o1",
        provider: "openai",
        description: "Reasoning model for complex tasks",
        contextWindow: 128000,
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
