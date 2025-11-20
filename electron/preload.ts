import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script - runs in renderer process before web content loads
 * Provides safe, limited access to Electron APIs via context bridge
 */

// Define the API interface
export interface ElectronAPI {
    getCdpUrl: () => Promise<string>;
    getAutomationBrowserWsUrl: () => Promise<string>;
    getAppVersion: () => Promise<string>;
    isElectron: () => Promise<boolean>;
    openExternal: (url: string) => Promise<void>;
    platform: NodeJS.Platform;
    isDev: boolean;
}

// Expose Electron API to renderer process
contextBridge.exposeInMainWorld('electron', {
    getCdpUrl: () => ipcRenderer.invoke('get-cdp-url'),
    getAutomationBrowserWsUrl: () => ipcRenderer.invoke('get-automation-browser-ws-url'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    isElectron: () => ipcRenderer.invoke('is-electron'),
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
    platform: process.platform,
    isDev: process.env.NODE_ENV === 'development',
} as ElectronAPI);

console.log('[Electron] Preload script loaded');
