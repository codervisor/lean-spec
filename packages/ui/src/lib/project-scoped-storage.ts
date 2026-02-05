/**
 * Project-scoped localStorage abstraction for Zustand persist middleware.
 * 
 * This module provides utilities to scope persisted state by project,
 * so different projects have independent preferences (filters, view modes, etc.).
 * 
 * Usage with Zustand:
 * ```ts
 * import { createProjectScopedStorage } from '../lib/project-scoped-storage';
 * 
 * const useMyStore = create<MyState>()(
 *   persist(
 *     (set) => ({ ... }),
 *     {
 *       name: 'my-store-key',
 *       storage: createProjectScopedStorage(),
 *     }
 *   )
 * );
 * ```
 */
import type { StateStorage } from 'zustand/middleware';

const PROJECT_ID_KEY = 'leanspec-current-project';

/**
 * Gets the current project ID from localStorage.
 * Falls back to looking for machine-scoped project keys.
 */
export function getCurrentProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Check for direct key first
  const directId = localStorage.getItem(PROJECT_ID_KEY);
  if (directId) return directId;
  
  // Check for machine-scoped keys (pattern: leanspec-current-project:machineId)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${PROJECT_ID_KEY}:`)) {
      const value = localStorage.getItem(key);
      if (value) return value;
    }
  }
  
  return null;
}

/**
 * Gets a project-scoped storage key.
 * Returns format: `${baseKey}:project:${projectId}` or just `${baseKey}` if no project.
 */
export function getProjectScopedKey(baseKey: string, projectId?: string | null): string {
  const pid = projectId ?? getCurrentProjectId();
  return pid ? `${baseKey}:project:${pid}` : baseKey;
}

/**
 * Project-scoped storage that implements Zustand's StateStorage interface.
 * Keys are automatically scoped by the current project ID.
 */
const projectScopedStorage: StateStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    
    const scopedKey = getProjectScopedKey(name);
    return localStorage.getItem(scopedKey);
  },
  
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    
    const scopedKey = getProjectScopedKey(name);
    localStorage.setItem(scopedKey, value);
  },
  
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    
    const scopedKey = getProjectScopedKey(name);
    localStorage.removeItem(scopedKey);
  },
};

/**
 * Creates a project-scoped storage adapter for Zustand persist middleware.
 * 
 * State is automatically scoped to the current project, so switching projects
 * loads different preferences.
 */
export function createProjectScopedStorage(): StateStorage {
  return projectScopedStorage;
}

/**
 * Hook-friendly version that generates project-scoped keys.
 * Use this in React components or hooks that use useLocalStorage directly.
 */
export function useProjectScopedKey(baseKey: string): string {
  // This is a simple synchronous function that gets current project
  // For reactive updates when project changes, the component should
  // also depend on project context
  return getProjectScopedKey(baseKey);
}

/**
 * Migrates a global preference key to project-scoped format.
 * Call this once per preference key to migrate existing user data.
 * 
 * This moves data from the old global key to the project-scoped key
 * for the current project, then removes the global key.
 */
export function migrateToProjectScoped(baseKey: string): void {
  if (typeof window === 'undefined') return;
  
  const projectId = getCurrentProjectId();
  if (!projectId) return;
  
  const globalValue = localStorage.getItem(baseKey);
  if (!globalValue) return;
  
  const scopedKey = getProjectScopedKey(baseKey, projectId);
  
  // Only migrate if scoped key doesn't exist yet
  if (!localStorage.getItem(scopedKey)) {
    localStorage.setItem(scopedKey, globalValue);
  }
  
  // Remove global key
  localStorage.removeItem(baseKey);
}
