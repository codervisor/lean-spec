/**
 * Hook to rehydrate project-scoped Zustand stores when the project changes.
 * 
 * This should be called once at the app root level to ensure stores
 * reload their state from the correct project-scoped localStorage keys.
 */
import { useLayoutEffect, useRef } from 'react';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { useSpecsPreferencesStore, useSpecsSidebarStore } from '../stores/specs-preferences';
import { useSessionsSidebarStore } from '../stores/sessions-sidebar';
import { useSearchStore } from '../stores/search';

// Track the last synced project ID globally to detect changes synchronously
let lastSyncedProjectId: string | null = null;

/**
 * Rehydrates all project-scoped stores synchronously.
 * Call this when the current project changes.
 */
export function rehydrateProjectScopedStores(): void {
  // Zustand persist stores have a rehydrate() method on their persist API
  useSpecsPreferencesStore.persist.rehydrate();
  useSpecsSidebarStore.persist.rehydrate();
  useSessionsSidebarStore.persist.rehydrate();
  useSearchStore.persist.rehydrate();
}

/**
 * Hook that automatically rehydrates project-scoped stores when the project changes.
 * Place this once near the root of your app, inside a component that has access to project context.
 * 
 * Uses useLayoutEffect to rehydrate synchronously before paint, preventing visual flicker.
 */
export function useProjectScopedStoreSync(): void {
  const { currentProject, loading } = useCurrentProject();
  const hasInitializedRef = useRef(false);

  // Use layout effect to run synchronously before browser paint
  useLayoutEffect(() => {
    if (loading) return;

    const currentId = currentProject?.id ?? null;

    if (hasInitializedRef.current) {
      // After initialization, rehydrate on any project change
      if (currentId !== lastSyncedProjectId) {
        rehydrateProjectScopedStores();
        lastSyncedProjectId = currentId;
      }
    } else {
      // First initialization - just record the current project
      lastSyncedProjectId = currentId;
      hasInitializedRef.current = true;
    }
  }, [currentProject?.id, loading]);
}
