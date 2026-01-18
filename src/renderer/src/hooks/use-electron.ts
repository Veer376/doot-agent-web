'use client';

import { useEffect, useState } from 'react';
import { isElectron as checkIsElectron, getCdpUrl, getPlatform, getAppVersion } from '@/lib/electron';

interface ElectronInfo {
    isElectron: boolean;
    platform: string;
    cdpUrl: string | null;
    appVersion: string | null;
    isLoading: boolean;
}

/**
 * Hook to detect and interact with Electron environment
 * Returns electron information and utilities
 */
export function useElectron(): ElectronInfo {
    const [info, setInfo] = useState<ElectronInfo>({
        isElectron: false,
        platform: 'web',
        cdpUrl: null,
        appVersion: null,
        isLoading: true,
    });

    useEffect(() => {
        const loadElectronInfo = async () => {
            const isElectronEnv = checkIsElectron();

            if (!isElectronEnv) {
                setInfo({
                    isElectron: false,
                    platform: 'web',
                    cdpUrl: null,
                    appVersion: null,
                    isLoading: false,
                });
                return;
            }

            // Load Electron-specific information
            const [cdpUrl, appVersion] = await Promise.all([
                getCdpUrl(),
                getAppVersion(),
            ]);

            setInfo({
                isElectron: true,
                platform: getPlatform(),
                cdpUrl,
                appVersion,
                isLoading: false,
            });
        };

        loadElectronInfo();
    }, []);

    return info;
}
