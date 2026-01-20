import { app, BrowserWindow, ipcMain, shell, utilityProcess } from 'electron';
import { join } from 'path';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { is, electronApp, optimizer } from '@electron-toolkit/utils';
import { registerLocalAgentHandlers } from './ipc-handlers';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

console.log('[Main] Environment variables loaded');
console.log('[Main] GOOGLE_API_KEY present:', !!process.env.GOOGLE_API_KEY);
console.log('[Main] ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY);
console.log('[Main] OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);

// Global references
let mainWindow: BrowserWindow | null = null;
let automationBrowserProcess: ChildProcess | null = null;
const CDP_PORT = 9222;
const AUTOMATION_CDP_PORT = 9223;
app.commandLine.appendSwitch('remote-debugging-port', String(CDP_PORT));

function launchAutomationBrowser(): Promise<string> {
    return new Promise((resolve, reject) => {
        const chromePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            // Fallback for user install
            ...(process.env.USERPROFILE ? [join(process.env.USERPROFILE, 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe')] : [])
        ];

        let chromePath = null;
        for (const path of chromePaths) {
            if (existsSync(path)) {
                chromePath = path;
                break;
            }
        }

        if (!chromePath) {
            reject(new Error('Chrome not found'));
            return;
        }

        automationBrowserProcess = spawn(chromePath, [
            `--remote-debugging-port=${AUTOMATION_CDP_PORT}`,
            '--no-first-run',
            '--no-default-browser-check',
            '--user-data-dir=' + join(tmpdir(), 'doot-automation-profile'),
            '--disable-features=VizDisplayCompositor'
        ], {
            detached: true,
            stdio: 'ignore'
        });

        automationBrowserProcess.on('error', reject);

        let attempts = 0;
        const checkCdp = () => {
            attempts++;
            fetch(`http://localhost:${AUTOMATION_CDP_PORT}/json`)
                .then(response => response.json())
                .then((targets: any) => {
                    const targetArray = targets as any[];
                    if (targetArray && targetArray.length > 0) {
                        resolve(targetArray[0].webSocketDebuggerUrl);
                    } else {
                        throw new Error('No targets found');
                    }
                })
                .catch(() => {
                    if (attempts < 30) {
                        setTimeout(checkCdp, 1000);
                    } else {
                        reject(new Error('Timeout waiting for automation browser CDP'));
                    }
                });
        };

        setTimeout(checkCdp, 2000);
    });
}

function createWindow(): void {
    const preloadPath = join(__dirname, '../preload/index.mjs');
    
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 600,
        show: false,
        backgroundColor: '#000000',
        webPreferences: {
            preload: preloadPath,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        titleBarStyle: 'default',
    });

    mainWindow.on('ready-to-show', () => {
        mainWindow?.show();
        if (is.dev) mainWindow?.webContents.openDevTools();
    });

    // Handle navigation - allow OAuth callbacks but open external links in browser
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const parsedUrl = new URL(url);
        const currentUrl = mainWindow?.webContents.getURL();
        const currentParsed = currentUrl ? new URL(currentUrl) : null;
        
        // Allow navigation within the same origin (includes OAuth callbacks)
        if (currentParsed && parsedUrl.origin === currentParsed.origin) {
            console.log('[Electron] Allowing same-origin navigation:', url.slice(0, 50));
            return;
        }
        
        // Allow Supabase auth domain for OAuth
        if (parsedUrl.hostname.includes('supabase.co')) {
            console.log('[Electron] Allowing Supabase auth:', url.slice(0, 50));
            return;
        }
        
        // Block external navigation and open in default browser instead
        event.preventDefault();
        console.log('[Electron] Opening external URL in browser:', url.slice(0, 50));
        shell.openExternal(url);
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }: any) => {
        // Handle OAuth and external links
        if (url.includes('supabase.co/auth') ||
            url.includes('accounts.google.com') ||
            url.includes('github.com/login') ||
            url.includes('oauth')) {
            console.log('[Electron] OAuth popup detected, loading in main window:', url.slice(0, 50));
            return { action: 'deny' };
        }

        console.log('[Electron] Opening external link:', url.slice(0, 50));
        shell.openExternal(url);
        return { action: 'deny' };
    });

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }
}

app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.orbitagent');

    // Register local agent IPC handlers
    registerLocalAgentHandlers(ipcMain);

    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window);
    });

    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers
ipcMain.handle('get-cdp-url', () => `http://localhost:${CDP_PORT}`);

ipcMain.handle('get-automation-browser-ws-url', async () => {
    if (!automationBrowserProcess) await launchAutomationBrowser();
    const response = await fetch(`http://localhost:${AUTOMATION_CDP_PORT}/json`);
    const targets: any = await response.json();
    return targets[0].webSocketDebuggerUrl;
});

ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('is-electron', () => true);
ipcMain.handle('open-external', (_event, url: string) => shell.openExternal(url));
