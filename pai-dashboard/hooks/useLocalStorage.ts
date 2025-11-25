"use client";

import { useState, useEffect, useCallback } from "react";
import { safeJsonParse } from "@/lib/utils";

/**
 * Custom hook for managing state in localStorage with TypeScript support
 * Automatically serializes/deserializes JSON and syncs across tabs
 *
 * @param key - The localStorage key
 * @param initialValue - Initial value if key doesn't exist
 * @returns Tuple of [value, setValue, removeValue]
 *
 * @example
 * const [theme, setTheme, removeTheme] = useLocalStorage<string>("theme", "dark");
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? safeJsonParse<T>(item, initialValue) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;

        setStoredValue(valueToStore);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));

          // Trigger storage event for cross-tab synchronization
          window.dispatchEvent(
            new StorageEvent("storage", {
              key,
              newValue: JSON.stringify(valueToStore),
            })
          );
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);

        // Trigger storage event for cross-tab synchronization
        window.dispatchEvent(
          new StorageEvent("storage", {
            key,
            newValue: null,
          })
        );
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Listen for changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(safeJsonParse<T>(e.newValue, initialValue));
        } catch (error) {
          console.error(`Error parsing storage event for key "${key}":`, error);
        }
      } else if (e.key === key && e.newValue === null) {
        setStoredValue(initialValue);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
