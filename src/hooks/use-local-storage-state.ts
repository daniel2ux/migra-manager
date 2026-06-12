"use client";

import { useState, useCallback } from "react";

export function useLocalStorageState<T>(
    key: string,
    defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
    const [state, setState] = useState<T>(() => {
        if (typeof window === "undefined") return defaultValue;
        try {
            const stored = localStorage.getItem(key);
            return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
        } catch {
            return defaultValue;
        }
    });

    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            setState((prev) => {
                const nextValue = value instanceof Function ? value(prev) : value;
                try {
                    localStorage.setItem(key, JSON.stringify(nextValue));
                } catch {
                    // quota exceeded or private mode — fail silently
                }
                return nextValue;
            });
        },
        [key]
    );

    return [state, setValue];
}
