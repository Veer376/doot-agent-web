/**
 * Local Agent Configuration
 * 
 * Defines system assistants available in the Electron app.
 * Similar to backend's config.py with system_assistants.
 */

export interface LocalAssistant {
    id: string;
    name: string;
    description: string;
    graph_id: string;
    config: {
        recursion_limit?: number;
        [key: string]: unknown;
    };
    metadata: {
        source: 'local';
        icon?: string;
        is_primary?: boolean;
        [key: string]: unknown;
    };
    created_at: string;
    updated_at: string;
}

/**
 * System assistants registry
 * These are loaded at startup and available via IPC
 */
export const systemAssistants: Record<string, LocalAssistant> = {
    'local-agent': {
        id: 'local-agent',
        name: 'Local Agent',
        description: 'AI coding assistant running locally on your machine',
        graph_id: 'browser_agent', // Hardcoded for now, can be dynamic later
        config: {
            recursion_limit: 50,
        },
        metadata: {
            source: 'local',
            icon: 'robot',
            is_primary: true,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
};

/**
 * Get all local assistants
 */
export function getLocalAssistants(): LocalAssistant[] {
    return Object.values(systemAssistants);
}

/**
 * Get a specific local assistant by id
 */
export function getLocalAssistant(id: string): LocalAssistant | undefined {
    return systemAssistants[id];
}
