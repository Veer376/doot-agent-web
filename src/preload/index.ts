import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script - runs in renderer process before web content loads
 * Provides safe, limited access to Electron APIs via context bridge
 */

// Track event listeners for cleanup
const eventListeners = new Map<string, Set<(...args: unknown[]) => void>>();

// Define the API interface
export interface ElectronAPI {
    // App info
    getAppVersion: () => Promise<string>;
    isElectron: () => Promise<boolean>;
    openExternal: (url: string) => Promise<void>;
    platform: NodeJS.Platform;
    isDev: boolean;

    // Generic IPC methods for local agent communication
    invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
    send: (channel: string, ...args: unknown[]) => void;
    on: (channel: string, callback: (...args: unknown[]) => void) => void;
    off: (channel: string, callback: (...args: unknown[]) => void) => void;
    once: (channel: string, callback: (...args: unknown[]) => void) => void;
}

// Allowed IPC channels for security
const ALLOWED_CHANNELS = {
    invoke: [
        // Thread operations
        'threads:list', 'threads:get', 'threads:create', 'threads:update',
        'threads:delete', 'threads:getState', 'threads:history', 'threads:generateTitle',
        // Agent operations
        'agents:list', 'agents:get', 'agents:create', 'agents:update', 'agents:delete',
        // Model operations
        'models:list', 'models:setDefault',
        // Workspace operations
        'workspace:select', 'workspace:get', 'workspace:set',
        'workspace:readFile', 'workspace:readBinaryFile', 'workspace:loadFromDisk',
        // Agent runtime
        'agent:cancel',
        // MCP server operations
        'mcp:registry:get', 'mcp:managed:list',
        'mcp:server:install', 'mcp:server:uninstall',
        'mcp:server:activate', 'mcp:server:deactivate',
        'mcp:server:connect', 'mcp:server:tools', 'mcp:server:status',
        // App
        'get-app-version', 'is-electron', 'open-external',
    ],
    send: [
        'agent:invoke', 'agent:resume', 'agent:interrupt', 'agent:cancel',
    ],
    receive: [
        'agent:stream:', // Prefix for dynamic channels like agent:stream:threadId
        'auth:session-update',
    ],
};

function isChannelAllowed(channel: string, type: 'invoke' | 'send' | 'receive'): boolean {
    const allowedList = ALLOWED_CHANNELS[type];
    return allowedList.some(allowed =>
        allowed.endsWith(':') ? channel.startsWith(allowed) : channel === allowed
    );
}

// Expose Electron API to renderer process
contextBridge.exposeInMainWorld('electron', {
    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    isElectron: () => ipcRenderer.invoke('is-electron'),
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
    platform: process.platform,
    isDev: process.env.NODE_ENV === 'development',

    // Generic IPC invoke - for request/response pattern
    invoke: <T = unknown>(channel: string, ...args: unknown[]): Promise<T> => {
        if (!isChannelAllowed(channel, 'invoke')) {
            console.warn(`[Preload] Blocked invoke on unauthorized channel: ${channel}`);
            return Promise.reject(new Error(`Channel not allowed: ${channel}`));
        }
        return ipcRenderer.invoke(channel, ...args);
    },

    // Generic IPC send - for one-way messages (fire and forget)
    send: (channel: string, ...args: unknown[]): void => {
        if (!isChannelAllowed(channel, 'send')) {
            console.warn(`[Preload] Blocked send on unauthorized channel: ${channel}`);
            return;
        }
        ipcRenderer.send(channel, ...args);
    },

    // Subscribe to IPC events from main process
    on: (channel: string, callback: (...args: unknown[]) => void): void => {
        if (!isChannelAllowed(channel, 'receive')) {
            console.warn(`[Preload] Blocked on() for unauthorized channel: ${channel}`);
            return;
        }

        // Wrap callback to strip the event argument
        const wrappedCallback = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
            callback(...args);
        };

        // Track for cleanup
        if (!eventListeners.has(channel)) {
            eventListeners.set(channel, new Set());
        }
        eventListeners.get(channel)!.add(callback);

        // Store wrapped callback reference for removal
        (callback as any).__wrapped = wrappedCallback;
        ipcRenderer.on(channel, wrappedCallback);
    },

    // Unsubscribe from IPC events
    off: (channel: string, callback: (...args: unknown[]) => void): void => {
        const wrapped = (callback as any).__wrapped;
        if (wrapped) {
            ipcRenderer.removeListener(channel, wrapped);
        }
        eventListeners.get(channel)?.delete(callback);
    },

    // Subscribe for a single event
    once: (channel: string, callback: (...args: unknown[]) => void): void => {
        if (!isChannelAllowed(channel, 'receive')) {
            console.warn(`[Preload] Blocked once() for unauthorized channel: ${channel}`);
            return;
        }
        ipcRenderer.once(channel, (_event, ...args) => callback(...args));
    },
} as ElectronAPI);

