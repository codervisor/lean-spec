/**
 * Zustand store for search-related persisted state.
 * Uses persist middleware for automatic localStorage sync.
 * Search history is scoped per project for relevant results.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createProjectScopedStorage, migrateToProjectScoped } from '../lib/project-scoped-storage';

interface SearchState {
  // Recent search history (max 5 items)
  recentSearches: string[];
  
  // Actions
  addRecentSearch: (label: string) => void;
  clearRecentSearches: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recentSearches: [],
      
      addRecentSearch: (label) => set((state) => ({
        recentSearches: [label, ...state.recentSearches.filter((item) => item !== label)].slice(0, 5),
      })),
      
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'leanspec-recent-searches',
      storage: createJSONStorage(() => createProjectScopedStorage()),
      partialize: (state) => ({
        recentSearches: state.recentSearches,
      }),
    }
  )
);

// Migrate global search history to project-scoped
if (typeof window !== 'undefined') {
  migrateToProjectScoped('leanspec-recent-searches');
}
