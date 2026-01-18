import { useSearchParams } from "react-router-dom";
import { useCallback, useMemo } from "react";

/**
 * Nuqs-compatible parsers shim
 * These are simplified versions that work with react-router-dom
 */
export const parseAsString = {
    withDefault: (defaultValue: string) => ({
        defaultValue,
        parse: (v: string | null) => v ?? defaultValue,
        serialize: (v: string) => v,
    }),
    parse: (v: string | null) => v,
    serialize: (v: string) => v,
};

export const parseAsInteger = {
    withDefault: (defaultValue: number) => ({
        defaultValue,
        parse: (v: string | null) => (v ? parseInt(v, 10) : defaultValue),
        serialize: (v: number) => String(v),
    }),
    parse: (v: string | null) => (v ? parseInt(v, 10) : null),
    serialize: (v: number) => String(v),
};

type SetStateAction<T> = T | ((prev: T) => T);

/**
 * Shim for nuqs useQueryState using react-router-dom
 */
export function useQueryState<T = string | null>(
    key: string,
    parser?: {
        defaultValue?: T;
        parse?: (v: string | null) => T;
        serialize?: (v: T) => string
    }
): [T, (value: SetStateAction<T | null>) => Promise<URLSearchParams>] {
    const [searchParams, setSearchParams] = useSearchParams();
    const rawValue = searchParams.get(key);

    const value = useMemo(() => {
        if (parser?.parse) {
            return parser.parse(rawValue);
        }
        return (rawValue ?? parser?.defaultValue ?? null) as T;
    }, [rawValue, parser]);

    const setValue = useCallback(
        (newValue: SetStateAction<T | null>) => {
            setSearchParams(
                (prev) => {
                    const newParams = new URLSearchParams(prev);
                    const currentValue = newParams.get(key);
                    const currentParsed = parser?.parse
                        ? parser.parse(currentValue)
                        : currentValue;
                    const resolvedValue =
                        typeof newValue === "function"
                            ? (newValue as (prev: T) => T | null)(currentParsed as T)
                            : newValue;

                    if (
                        resolvedValue === null ||
                        resolvedValue === undefined ||
                        resolvedValue === ""
                    ) {
                        newParams.delete(key);
                    } else {
                        const serialized = parser?.serialize
                            ? parser.serialize(resolvedValue as T)
                            : String(resolvedValue);
                        newParams.set(key, serialized);
                    }
                    return newParams;
                },
                { replace: true }
            );

            return Promise.resolve(new URLSearchParams(window.location.search));
        },
        [key, setSearchParams, parser]
    );

    return [value, setValue];
}

/**
 * Shim for nuqs useQueryStates - handles multiple query params at once
 */
export function useQueryStates<T extends Record<string, unknown>>(
    schema: Record<
        string,
        { defaultValue?: unknown; parse?: (v: string | null) => unknown; serialize?: (v: unknown) => string }
    >
): [T, (values: Partial<T>) => Promise<URLSearchParams>] {
    const [searchParams, setSearchParams] = useSearchParams();

    const values = useMemo(() => {
        const result: Record<string, unknown> = {};
        for (const [key, parser] of Object.entries(schema)) {
            const rawValue = searchParams.get(key);
            if (parser?.parse) {
                result[key] = parser.parse(rawValue);
            } else {
                result[key] = rawValue ?? parser?.defaultValue ?? null;
            }
        }
        return result as T;
    }, [searchParams, schema]);

    const setValues = useCallback(
        (newValues: Partial<T>) => {
            setSearchParams(
                (prev) => {
                    const newParams = new URLSearchParams(prev);
                    for (const [key, value] of Object.entries(newValues)) {
                        if (value === null || value === undefined || value === "") {
                            newParams.delete(key);
                        } else {
                            const parser = schema[key];
                            const serialized = parser?.serialize
                                ? parser.serialize(value)
                                : String(value);
                            newParams.set(key, serialized);
                        }
                    }
                    return newParams;
                },
                { replace: true }
            );

            return Promise.resolve(new URLSearchParams(window.location.search));
        },
        [setSearchParams, schema]
    );

    return [values, setValues];
}
