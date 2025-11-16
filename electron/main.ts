import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';

// Keep a global reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let nextProcess: ChildProcess | null = null;

// Enable CDP for browser automation
const CDP_PORT = 9222;
app.commandLine.appendSwitch('remote-debugging-port', String(CDP_PORT));

// Disable hardware acceleration if needed for compatibility
// app.disableHardwareAcceleration();

const isDev = process.env.NODE_ENV === 'development';
const NEXT_DEV_PORT = 3000;
const NEXT_PROD_PORT = 3000;

/**
 * Start Next.js server in production mode
 */
function startNextServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log('[Electron] Starting Next.js server...');

        // In production, use the standalone server
        const nextServerPath = join(process.resourcesPath, 'app', 'server.js');

        nextProcess = spawn('node', [nextServerPath], {
            env: {
                ...process.env,
                PORT: String(NEXT_PROD_PORT),
                NODE_ENV: 'production',
            },
            stdio: 'inherit',
        });

        nextProcess.on('error', (error) => {
            console.error('[Electron] Failed to start Next.js server:', error);
            reject(error);
        });

        // Wait a bit for server to start
        setTimeout(() => {
            console.log('[Electron] Next.js server started');
            resolve();
        }, 2000);
    });
}

/**
 * Create the main application window
 */
async function createWindow() {
    console.log('[Electron] Creating main window...');
    console.log(`[Electron] CDP enabled on port ${CDP_PORT}`);
    console.log(`[Electron] CDP URL: http://localhost:${CDP_PORT}`);

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 600,
        show: false, // Don't show until ready
        backgroundColor: '#000000',
        webPreferences: {
            preload: join(__dirname, 'preload.js'),
            nodeIntegration: false, // Security: disable node integration
            contextIsolation: true, // Security: enable context isolation
            sandbox: true, // Security: enable sandbox
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        titleBarStyle: 'default',
        icon: join(__dirname, '../public/icon.png'), // Add your icon
    });

    // Determine the URL to load
    const appUrl = isDev
        ? `http://localhost:${NEXT_DEV_PORT}`
        : `http://localhost:${NEXT_PROD_PORT}`;

    console.log(`[Electron] Loading app from: ${appUrl}`);

    // Load the Next.js app
    await mainWindow.loadURL(appUrl);

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        console.log('[Electron] Window ready to show');
        mainWindow?.show();

        if (isDev) {
            mainWindow?.webContents.openDevTools();
        }
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Open external links in browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    // Handle navigation to external URLs
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const appHost = new URL(appUrl).host;
        const urlHost = new URL(url).host;

        if (urlHost !== appHost) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });
}

/**
 * App lifecycle: when ready
 */
app.whenReady().then(async () => {
    console.log('[Electron] App is ready');
    console.log(`[Electron] Version: ${app.getVersion()}`);
    console.log(`[Electron] Mode: ${isDev ? 'development' : 'production'}`);

    // Start Next.js server in production
    if (!isDev) {
        try {
            await startNextServer();
        } catch (error) {
            console.error('[Electron] Failed to start Next.js:', error);
            app.quit();
            return;
        }
    }

    // Create window
    await createWindow();

    // macOS: Re-create window when dock icon is clicked
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

/**
 * App lifecycle: all windows closed
 */
app.on('window-all-closed', () => {
    // On macOS, keep app running until explicit quit
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

/**
 * App lifecycle: before quit
 */
app.on('before-quit', () => {
    console.log('[Electron] App quitting...');

    // Kill Next.js server
    if (nextProcess) {
        console.log('[Electron] Stopping Next.js server...');
        nextProcess.kill();
        nextProcess = null;
    }
});

/**
 * IPC Handlers
 */

// Get CDP URL
ipcMain.handle('get-cdp-url', () => {
    return `http://localhost:${CDP_PORT}`;
});

// Get app version
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// Check if running in Electron
ipcMain.handle('is-electron', () => {
    return true;
});

// Open external URL
ipcMain.handle('open-external', (_event, url: string) => {
    shell.openExternal(url);
});

console.log('[Electron] Main process loaded');
