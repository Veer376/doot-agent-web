"use client";

/**
 * Utility functions for stream hook.
 * Ported from @langchain/langgraph-sdk/ui/utils.js
 */

/**
 * Find the last item in an array matching predicate.
 */
export function findLast<T>(
    array: T[],
    predicate: (item: T) => boolean
): T | undefined {
    for (let i = array.length - 1; i >= 0; i--) {
        if (predicate(array[i])) {
            return array[i];
        }
    }
    return undefined;
}

/**
 * Get unique values from an array.
 */
export function unique<T>(array: T[]): T[] {
    return [...new Set(array)];
}

/**
 * Get a hash string from client config for caching.
 */
export function getClientConfigHash(client: { apiUrl?: string }): string {
    return client.apiUrl || "default";
}
