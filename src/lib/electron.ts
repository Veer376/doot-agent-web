/**
 * Electron environment detection and utilities
 * Works in both web and Electron environments
 */

export function isElectron(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    return !!(window as any).electron;
}

export async function getCdpUrl(): Promise<string | null> {
    if (!isElectron()) {
        return null;
    }
    try {
        return await (window as any).electron.getCdpUrl();
    } catch (error) {
        console.error('[Electron] Failed to get CDP URL:', error);
        return null;
    }
}

export async function getAppVersion(): Promise<string | null> {
    if (!isElectron()) {
        return null;
    }
    try {
        return await (window as any).electron.getAppVersion();
    } catch (error) {
        console.error('[Electron] Failed to get app version:', error);
        return null;
    }
}

export function getPlatform(): string {
    if (!isElectron()) {
        return typeof window !== 'undefined' ? 'web' : 'server';
    }
    return (window as any).electron.platform || 'unknown';
}

export async function openExternal(url: string): Promise<void> {
    if (!isElectron()) {
        // Fallback to window.open for web
        window.open(url, '_blank');
        return;
    }
    try {
        await (window as any).electron.openExternal(url);
    } catch (error) {
        console.error('[Electron] Failed to open external URL:', error);
        window.open(url, '_blank');
    }
}

export function isDev(): boolean {
    if (!isElectron()) {
        return process.env.NODE_ENV === 'development';
    }
    return (window as any).electron.isDev || false;
}
