/**
 * Electron environment detection and utilities
 * Works in both web and Electron environments
 * In web context, isElectron() returns false and all IPC calls are no-ops.
 */

export function isElectron(): boolean {
  if (typeof window === "undefined") {
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
    console.error("[Electron] Failed to get CDP URL:", error);
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
    console.error("[Electron] Failed to get app version:", error);
    return null;
  }
}

export function getPlatform(): string {
  if (!isElectron()) {
    return typeof window !== "undefined" ? "web" : "server";
  }
  return (window as any).electron.platform || "unknown";
}

export async function openExternal(url: string): Promise<void> {
  if (!isElectron()) {
    window.open(url, "_blank");
    return;
  }
  try {
    await (window as any).electron.openExternal(url);
  } catch (error) {
    console.error("[Electron] Failed to open external URL:", error);
    window.open(url, "_blank");
  }
}

export function isDev(): boolean {
  if (!isElectron()) {
    return process.env.NODE_ENV === "development";
  }
  return (window as any).electron.isDev || false;
}

/**
 * Generic IPC invoke for calling main process handlers
 * @param channel - The IPC channel name (e.g., 'threads:list')
 * @param args - Arguments to pass to the handler
 * @returns Promise with the result from main process
 */
export async function invoke<T = unknown>(
  channel: string,
  args?: unknown,
): Promise<T> {
  if (!isElectron()) {
    throw new Error("invoke() can only be called in Electron environment");
  }
  try {
    const electron = (window as any).electron;
    if (typeof electron.invoke === "function") {
      return await electron.invoke(channel, args);
    }
    const method = electron[channel.replace(":", "_").replace(/-/g, "_")];
    if (typeof method === "function") {
      return await method(args);
    }
    throw new Error(`No handler found for channel: ${channel}`);
  } catch (error) {
    console.error(`[Electron] IPC invoke failed for ${channel}:`, error);
    throw error;
  }
}

/**
 * Subscribe to IPC events from main process
 */
export function onIpcEvent(
  channel: string,
  callback: (data: unknown) => void,
): () => void {
  if (!isElectron()) {
    return () => {};
  }
  const electron = (window as any).electron;
  if (typeof electron.on === "function") {
    const listenerId: number | undefined = electron.on(channel, callback);
    return () => {
      if (
        typeof listenerId === "number" &&
        listenerId >= 0 &&
        typeof electron.offById === "function"
      ) {
        electron.offById(listenerId);
      } else if (typeof electron.off === "function") {
        electron.off(channel, callback);
      }
    };
  }
  if (electron.ipcRenderer) {
    const handler = (_event: unknown, data: unknown) => callback(data);
    electron.ipcRenderer.on(channel, handler);
    return () => electron.ipcRenderer.removeListener(channel, handler);
  }
  console.warn(`[Electron] Cannot subscribe to channel: ${channel}`);
  return () => {};
}

/**
 * Send a one-way message to main process (no response expected)
 */
export function send(channel: string, ...args: unknown[]): void {
  if (!isElectron()) {
    console.warn(
      "[Electron] send() can only be called in Electron environment",
    );
    return;
  }
  const electron = (window as any).electron;
  if (typeof electron.send === "function") {
    electron.send(channel, ...args);
  } else if (electron.ipcRenderer) {
    electron.ipcRenderer.send(channel, ...args);
  }
}
