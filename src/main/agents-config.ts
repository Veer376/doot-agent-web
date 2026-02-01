/**
 * Local Agent Configuration
 * 
 * Defines system assistants available in the Electron app.
 * Matches the structure of the Agent interface used in the renderer.
 */

export interface LocalAgent {
    assistant_id: string;
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
        modelId?: string;
        [key: string]: unknown;
    };
    created_at: string;
    updated_at: string;
    version: number;
    context: null;
}

/**
 * System assistants registry
 * These are loaded at startup and available via IPC
 */
export const systemAssistants: Record<string, LocalAgent> = {
    'local-agent': {
        assistant_id: 'local-agent',
        name: 'Doot',
        description: 'AI coding assistant running locally on your machine',
        graph_id: 'local_agent',
        config: {
            recursion_limit: 100,
        },
        metadata: {
            source: 'local',
            icon: 'robot',
            is_primary: true,
            modelId: undefined, // Uses default model from settings
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        context: null,
    },
};

/**
 * Get all local assistants
 */
export function getLocalAssistants(): LocalAgent[] {
    return Object.values(systemAssistants);
}

/**
 * Get a specific local assistant by id
 */
export function getLocalAssistant(id: string): LocalAgent | undefined {
    return systemAssistants[id];
}
