/**
 * Type definitions for Electron API exposed to renderer
 */

export interface ElectronAPI {
    // Legacy CDP methods (kept for backward compatibility)
    getCdpUrl: () => Promise<string>;
    getAutomationBrowserWsUrl: () => Promise<string>;

    // Playwright Browser Server methods (recommended - secure)
    getPlaywrightBrowserWsUrl: () => Promise<string>;
    getPlaywrightServerStatus: () => Promise<{
        running: boolean;
        wsEndpoint: string | null;
        port: number | null;
    }>;
    isPlaywrightServerRunning: () => Promise<boolean>;
    closePlaywrightBrowser: () => Promise<{ success: boolean }>;

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

declare global {
    interface Window {
        electron?: ElectronAPI;
    }
}

export { };

