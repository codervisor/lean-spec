/**
 * Hook to rehydrate project-scoped Zustand stores when the project changes.
 * 
 * This should be called once at the app root level to ensure stores
 * reload their state from the correct project-scoped localStorage keys.
 */
import { useEffect, useRef } from 'react';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { useSpecsPreferencesStore, useSpecsSidebarStore } from '../stores/specs-preferences';
import { useSearchStore } from '../stores/search';
import { getCurrentProjectId } from './project-scoped-storage';

/**
 * Rehydrates all project-scoped stores.
 * Call this when the current project changes.
 */
export function rehydrateProjectScopedStores(): void {
  // Zustand persist stores have a rehydrate() method on their persist API
  useSpecsPreferencesStore.persist.rehydrate();
  useSpecsSidebarStore.persist.rehydrate();
  useSearchStore.persist.rehydrate();
}

/**
 * Hook that automatically rehydrates project-scoped stores when the project changes.
 * Place this once near the root of your app, inside a component that has access to project context.
 */
export function useProjectScopedStoreSync(): void {
  const { currentProject, loading } = useCurrentProject();
  const previousProjectIdRef = useRef<string | undefined>(undefined);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    const currentId = currentProject?.id ?? null;
    const previousId = previousProjectIdRef.current;

    // Check if we need to rehydrate
    if (hasInitializedRef.current) {
      // After initialization, rehydrate on any project change
      if (currentId !== previousId) {
        rehydrateProjectScopedStores();
      }
    } else {
      // On first load, check if Zustand hydrated with a different project
      // This can happen if localStorage project ID differs from React Query's first project
      const storedProjectId = getCurrentProjectId();
      if (currentId && storedProjectId !== currentId) {
        rehydrateProjectScopedStores();
      }
      hasInitializedRef.current = true;
    }

    previousProjectIdRef.current = currentId ?? undefined;
  }, [currentProject?.id, loading]);
}
