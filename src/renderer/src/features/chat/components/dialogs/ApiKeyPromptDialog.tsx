/**
 * API Key Prompt Dialog
 *
 * A modal dialog that prompts the user to enter an API key when a model
 * requires one that hasn't been configured.
 *
 * LIMITATION: Keys are stored in-memory only for the current session.
 * They will be lost on app restart. Database persistence will be added later.
 */

import React, { useState, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ApiProvider } from '@/hooks/use-api-key-prompt';

const PROVIDER_INFO: Record<ApiProvider, { name: string; description: string; placeholder: string }> = {
    google: {
        name: 'Google',
        description: 'Enter your Google AI API key to use Gemini models.',
        placeholder: 'AIza...',
    },
    anthropic: {
        name: 'Anthropic',
        description: 'Enter your Anthropic API key to use Claude models.',
        placeholder: 'sk-ant-...',
    },
    openai: {
        name: 'OpenAI',
        description: 'Enter your OpenAI API key to use GPT models.',
        placeholder: 'sk-...',
    },
};

interface ApiKeyPromptDialogProps {
    /** The provider that needs an API key (null to hide dialog) */
    provider: ApiProvider | null;
    /** Whether the key is currently being saved */
    isSaving: boolean;
    /** Error message from previous save attempt */
    error: string | null;
    /** Called when the user submits the key */
    onSubmit: (apiKey: string) => void;
    /** Called when the user cancels */
    onCancel: () => void;
}

export function ApiKeyPromptDialog({
    provider,
    isSaving,
    error,
    onSubmit,
    onCancel,
}: ApiKeyPromptDialogProps) {
    const [apiKey, setApiKey] = useState('');

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (apiKey.trim()) {
            onSubmit(apiKey.trim());
        }
    }, [apiKey, onSubmit]);

    const handleOpenChange = useCallback((open: boolean) => {
        if (!open) {
            onCancel();
        }
    }, [onCancel]);

    // Reset input when dialog opens for a new provider
    React.useEffect(() => {
        if (provider) {
            setApiKey('');
        }
    }, [provider]);

    if (!provider) {
        return null;
    }

    const info = PROVIDER_INFO[provider];

    return (
        <Dialog open={!!provider} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Enter {info.name} API Key</DialogTitle>
                        <DialogDescription>{info.description}</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="api-key">API Key</Label>
                            <Input
                                id="api-key"
                                type="password"
                                placeholder={info.placeholder}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                autoComplete="off"
                                autoFocus
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Note: This key is stored in-memory only and will be lost when the app restarts.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onCancel}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!apiKey.trim() || isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Save & Continue'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default ApiKeyPromptDialog;
