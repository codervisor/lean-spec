/**
 * Project-scoped localStorage hook.
 * 
 * Similar to useLocalStorage, but automatically scopes the key to the current project.
 * When the project changes, the state reloads from the new project-scoped key.
 */
import { useSyncExternalStore, useCallback, useMemo } from 'react';
import { useCurrentProject } from './useProjectQuery';
import { getProjectScopedKey } from '../lib/project-scoped-storage';

function readFromStorage<T>(key: string, initialValue: T): T {
  if (typeof window === 'undefined') return initialValue;

  try {
    const item = window.localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : initialValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return initialValue;
  }
}

function writeToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error writing localStorage key "${key}":`, error);
  }
}

// Event emitter for localStorage changes
const listeners = new Set<() => void>();
function emitChange() {
  listeners.forEach((listener) => listener());
}

/**
 * Hook for persisting state in localStorage, scoped by project.
 * 
 * Usage:
 * ```tsx
 * const [value, setValue] = useProjectScopedStorage('my-key', defaultValue);
 * ```
 * 
 * The actual localStorage key will be `my-key:project:{projectId}`.
 * When switching projects, the value automatically updates to the new project's stored value.
 */
export function useProjectScopedStorage<T>(
  baseKey: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const { currentProject } = useCurrentProject();
  const projectId = currentProject?.id ?? null;

  // Generate the scoped key
  const scopedKey = useMemo(
    () => getProjectScopedKey(baseKey, projectId),
    [baseKey, projectId]
  );

  // Subscribe to storage changes
  const subscribe = useCallback((callback: () => void) => {
    listeners.add(callback);
    
    // Also listen for storage events from other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === scopedKey) {
        callback();
      }
    };
    window.addEventListener('storage', handleStorage);
    
    return () => {
      listeners.delete(callback);
      window.removeEventListener('storage', handleStorage);
    };
  }, [scopedKey]);

  // Get current snapshot
  const getSnapshot = useCallback(
    () => readFromStorage(scopedKey, initialValue),
    [scopedKey, initialValue]
  );

  // Server snapshot
  const getServerSnapshot = useCallback(() => initialValue, [initialValue]);

  const storedValue = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  // Update localStorage when value changes
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      const currentValue = readFromStorage(scopedKey, initialValue);
      const valueToStore = value instanceof Function ? value(currentValue) : value;
      writeToStorage(scopedKey, valueToStore);
      emitChange();
    },
    [scopedKey, initialValue]
  );

  return [storedValue, setValue];
}
