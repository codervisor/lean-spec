/**
 * Zustand store for search-related persisted state.
 * Uses persist middleware for automatic localStorage sync.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
      partialize: (state) => ({
        recentSearches: state.recentSearches,
      }),
    }
  )
);
