import { useState, useCallback, useEffect, useRef } from "react";

export type VncConnectionStatus = "idle" | "connecting" | "preloading" | "ready" | "error";

export interface VncConnectionOptions {
    maxRetries?: number;
    initialDelay?: number;
    timeoutMs?: number;
    enabled?: boolean;
}

export interface VncConnectionResult {
    status: VncConnectionStatus;
    retryCount: number;
    error: string | null;
    retry: () => void;
    isReady: boolean;
    vncUrl: string | null;
}

interface VncConnectionConfig {
    vncUrl: string;
    password: string;
}

const DEFAULT_VNC_CONFIG: VncConnectionConfig = {
    vncUrl: "http://localhost:6080",
    password: "vncpassword",
};

/**
 * Hook to manage VNC connection with health checking and retry logic.
 * Based on Suna's useVncPreloader implementation.
 */
export function useVncConnection(
    options: VncConnectionOptions = {}
): VncConnectionResult {
    const {
        maxRetries = 5,
        initialDelay = 1000,
        timeoutMs = 5000,
        enabled = true,
    } = options;

    const [status, setStatus] = useState<VncConnectionStatus>("idle");
    const [retryCount, setRetryCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [vncUrl, setVncUrl] = useState<string | null>(null);

    const preloadIframeRef = useRef<HTMLIFrameElement | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const cleanup = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }
        if (preloadIframeRef.current) {
            document.body.removeChild(preloadIframeRef.current);
            preloadIframeRef.current = null;
        }
    }, []);

    const startPreloading = useCallback(
        (url: string) => {
            cleanup();
            setStatus("preloading");
            setError(null);

            // Create hidden iframe to preload VNC connection
            const iframe = document.createElement("iframe");
            iframe.src = url;
            iframe.style.position = "absolute";
            iframe.style.left = "-9999px";
            iframe.style.width = "1px";
            iframe.style.height = "1px";
            iframe.style.border = "none";

            preloadIframeRef.current = iframe;

            // Set timeout for preload
            timeoutRef.current = setTimeout(() => {
                console.warn(`VNC preload timeout after ${timeoutMs}ms`);

                if (retryCount < maxRetries) {
                    // Calculate exponential backoff delay
                    const delay = Math.min(initialDelay * Math.pow(1.5, retryCount), 10000);
                    console.log(`Retrying VNC connection (attempt ${retryCount + 1}/${maxRetries}) after ${delay}ms`);

                    retryTimeoutRef.current = setTimeout(() => {
                        setRetryCount((prev) => prev + 1);
                        startPreloading(url);
                    }, delay);
                } else {
                    setStatus("error");
                    setError(`Failed to connect to VNC after ${maxRetries} attempts`);
                    cleanup();
                }
            }, timeoutMs);

            // Success handler
            iframe.onload = () => {
                console.log("VNC preload successful");
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
                setStatus("ready");
                setVncUrl(url);
                // Keep iframe in DOM briefly, then remove
                setTimeout(() => {
                    if (preloadIframeRef.current) {
                        document.body.removeChild(preloadIframeRef.current);
                        preloadIframeRef.current = null;
                    }
                }, 1000);
            };

            // Error handler
            iframe.onerror = () => {
                console.error("VNC iframe load error");
                if (retryCount < maxRetries) {
                    const delay = Math.min(initialDelay * Math.pow(1.5, retryCount), 10000);
                    retryTimeoutRef.current = setTimeout(() => {
                        setRetryCount((prev) => prev + 1);
                        startPreloading(url);
                    }, delay);
                } else {
                    setStatus("error");
                    setError("Failed to load VNC viewer");
                    cleanup();
                }
            };

            document.body.appendChild(iframe);
        },
        [retryCount, maxRetries, initialDelay, timeoutMs, cleanup]
    );

    const retry = useCallback(() => {
        setRetryCount(0);
        setError(null);
        setStatus("connecting");

        // Build VNC URL with autoconnect and scale parameters
        const config = DEFAULT_VNC_CONFIG;
        const fullUrl = `${config.vncUrl}/vnc_lite.html?password=${config.password}&autoconnect=true&scale=local`;

        startPreloading(fullUrl);
    }, [startPreloading]);

    // Auto-start connection when enabled
    useEffect(() => {
        if (enabled && status === "idle") {
            setStatus("connecting");
            const config = DEFAULT_VNC_CONFIG;
            const fullUrl = `${config.vncUrl}/vnc_lite.html?password=${config.password}&autoconnect=true&scale=local`;
            startPreloading(fullUrl);
        }

        return cleanup;
    }, [enabled, status, startPreloading, cleanup]);

    return {
        status,
        retryCount,
        error,
        retry,
        isReady: status === "ready",
        vncUrl,
    };
}
