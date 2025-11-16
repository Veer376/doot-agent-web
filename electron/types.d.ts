/**
 * Type definitions for Electron API exposed to renderer
 */

export interface ElectronAPI {
    getCdpUrl: () => Promise<string>;
    getAppVersion: () => Promise<string>;
    isElectron: () => Promise<boolean>;
    openExternal: (url: string) => Promise<void>;
    platform: NodeJS.Platform;
    isDev: boolean;
}

declare global {
    interface Window {
        electron?: ElectronAPI;
    }
}

export { };
