/// <reference types="vite/client" />

// Electron API exposed via preload script
interface ElectronAPI {
    getCdpUrl: () => Promise<string>;
    getAutomationBrowserWsUrl: () => Promise<string>;
    getPlaywrightBrowserWsUrl: () => Promise<string>;
    getPlaywrightServerStatus: () => Promise<{
        running: boolean;
        wsEndpoint: string | null;
        port: number | null;
    }>;
    isPlaywrightServerRunning: () => Promise<boolean>;
    closePlaywrightBrowser: () => Promise<{ success: boolean }>;
    getAppVersion: () => Promise<string>;
    isElectron: () => Promise<boolean>;
    openExternal: (url: string) => Promise<void>;
    platform: NodeJS.Platform;
    isDev: boolean;
    invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
    send: (channel: string, ...args: unknown[]) => void;
    on: (channel: string, func: (...args: unknown[]) => void) => () => void;
    off: (channel: string, func: (...args: unknown[]) => void) => void;
    once: (channel: string, func: (...args: unknown[]) => void) => void;
}

declare global {
    interface Window {
        electron?: ElectronAPI;
    }
}

export { };
