/**
 * API Key Prompt Hook
 *
 * Manages state for the API key prompting flow.
 * This hook intercepts "Missing API Key" errors from the stream,
 * presents a modal to the user, saves the key via IPC, and retries.
 *
 * LIMITATION: Keys are stored in-memory only for the current session.
 * They will be lost on app restart. Database persistence will be added later.
 */

import { useState, useCallback } from 'react';
import { invoke } from '@/lib/electron';

export type ApiProvider = 'anthropic' | 'openai' | 'google';

/** Pending request details to retry after key entry */
export interface PendingRequest {
    threadId: string;
    message: string;
    modelId?: string;
    workspacePath?: string;
    tools?: any[];
    toolkits?: any[];
}

export interface UseApiKeyPromptReturn {
    /** The provider that needs an API key (null if no prompt needed) */
    missingKeyProvider: ApiProvider | null;
    /** The pending request to retry after key entry */
    pendingRequest: PendingRequest | null;
    /** Call this when a "MISSING_API_KEY" error is detected */
    promptForKey: (provider: ApiProvider, request: PendingRequest) => void;
    /** Call when the user submits the key */
    submitKey: (apiKey: string) => Promise<boolean>;
    /** Call when the user cancels the dialog */
    cancel: () => void;
    /** Whether the key is being saved */
    isSavingKey: boolean;
    /** Error during key save */
    saveError: string | null;
}

export function useApiKeyPrompt(): UseApiKeyPromptReturn {
    const [missingKeyProvider, setMissingKeyProvider] = useState<ApiProvider | null>(null);
    const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null);
    const [isSavingKey, setIsSavingKey] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const promptForKey = useCallback((provider: ApiProvider, request: PendingRequest) => {
        console.log('[useApiKeyPrompt] Prompting for key:', provider);
        setMissingKeyProvider(provider);
        setPendingRequest(request);
        setSaveError(null);
    }, []);

    const submitKey = useCallback(async (apiKey: string): Promise<boolean> => {
        if (!missingKeyProvider) {
            console.warn('[useApiKeyPrompt] No provider set, cannot submit key');
            return false;
        }

        setIsSavingKey(true);
        setSaveError(null);

        try {
            const result = await invoke<{ success: boolean; error?: string }>('settings:setApiKey', {
                provider: missingKeyProvider,
                apiKey,
            });

            if (result.success) {
                console.log('[useApiKeyPrompt] API key saved successfully');
                // Clear the prompt state (caller should handle retry)
                setMissingKeyProvider(null);
                // Keep pendingRequest so caller can access it for retry
                return true;
            } else {
                console.error('[useApiKeyPrompt] Failed to save API key:', result.error);
                setSaveError(result.error || 'Failed to save API key');
                return false;
            }
        } catch (error) {
            console.error('[useApiKeyPrompt] Error saving API key:', error);
            setSaveError(error instanceof Error ? error.message : 'Unknown error');
            return false;
        } finally {
            setIsSavingKey(false);
        }
    }, [missingKeyProvider]);

    const cancel = useCallback(() => {
        console.log('[useApiKeyPrompt] User cancelled key prompt');
        setMissingKeyProvider(null);
        setPendingRequest(null);
        setSaveError(null);
    }, []);

    return {
        missingKeyProvider,
        pendingRequest,
        promptForKey,
        submitKey,
        cancel,
        isSavingKey,
        saveError,
    };
}

/**
 * Helper function to parse the structured error message
 * Returns the provider if it's a missing key error, null otherwise.
 */
export function parseMissingKeyError(errorMessage: string): ApiProvider | null {
    const match = errorMessage.match(/\[MISSING_API_KEY:(\w+)\]/);
    if (match && ['anthropic', 'openai', 'google'].includes(match[1])) {
        return match[1] as ApiProvider;
    }
    return null;
}
