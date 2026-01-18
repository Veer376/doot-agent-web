import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script - runs in renderer process before web content loads
 * Provides safe, limited access to Electron APIs via context bridge
 */

// Define the API interface
export interface ElectronAPI {
    // Legacy CDP methods (kept for backward compatibility)
    getCdpUrl: () => Promise<string>;
    getAutomationBrowserWsUrl: () => Promise<string>;
    
    // Playwright Browser Server methods (recommended)
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
}

// Expose Electron API to renderer process
contextBridge.exposeInMainWorld('electron', {
    // Legacy CDP methods
    getCdpUrl: () => ipcRenderer.invoke('get-cdp-url'),
    getAutomationBrowserWsUrl: () => ipcRenderer.invoke('get-automation-browser-ws-url'),
    
    // Playwright Browser Server methods
    getPlaywrightBrowserWsUrl: () => ipcRenderer.invoke('get-playwright-browser-ws-url'),
    getPlaywrightServerStatus: () => ipcRenderer.invoke('get-playwright-server-status'),
    isPlaywrightServerRunning: () => ipcRenderer.invoke('is-playwright-server-running'),
    closePlaywrightBrowser: () => ipcRenderer.invoke('close-playwright-browser'),
    
    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    isElectron: () => ipcRenderer.invoke('is-electron'),
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
    platform: process.platform,
    isDev: process.env.NODE_ENV === 'development',
} as ElectronAPI);

console.log('[Electron] Preload script loaded');
