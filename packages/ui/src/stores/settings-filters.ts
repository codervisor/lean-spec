/**
 * Zustand store for Settings page filter preferences.
 * Uses persist middleware for automatic localStorage sync.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// AI Settings Filters
// ============================================================================

export type AISortOption = 'name' | 'models' | 'configured';
export type AIStatusFilter = 'all' | 'configured' | 'unconfigured';

interface AIFiltersState {
  searchQuery: string;
  sortBy: AISortOption;
  statusFilter: AIStatusFilter;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: AISortOption) => void;
  setStatusFilter: (filter: AIStatusFilter) => void;
  resetFilters: () => void;
}

const AI_FILTERS_DEFAULTS = {
  searchQuery: '',
  sortBy: 'name' as AISortOption,
  statusFilter: 'all' as AIStatusFilter,
};

export const useAIFiltersStore = create<AIFiltersState>()(
  persist(
    (set) => ({
      ...AI_FILTERS_DEFAULTS,
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSortBy: (sort) => set({ sortBy: sort }),
      setStatusFilter: (filter) => set({ statusFilter: filter }),
      resetFilters: () => set(AI_FILTERS_DEFAULTS),
    }),
    {
      name: 'settings-ai-filters',
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        sortBy: state.sortBy,
        statusFilter: state.statusFilter,
      }),
    }
  )
);

// ============================================================================
// Runner Settings Filters
// ============================================================================

export type RunnerSortOption = 'name' | 'available';
export type RunnerSourceFilter = 'all' | 'builtin' | 'custom';

interface RunnerFiltersState {
  searchQuery: string;
  sortBy: RunnerSortOption;
  showUnavailable: boolean;
  sourceFilter: RunnerSourceFilter;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: RunnerSortOption) => void;
  setShowUnavailable: (show: boolean) => void;
  setSourceFilter: (filter: RunnerSourceFilter) => void;
  resetFilters: () => void;
}

const RUNNER_FILTERS_DEFAULTS = {
  searchQuery: '',
  sortBy: 'name' as RunnerSortOption,
  showUnavailable: false,
  sourceFilter: 'all' as RunnerSourceFilter,
};

export const useRunnerFiltersStore = create<RunnerFiltersState>()(
  persist(
    (set) => ({
      ...RUNNER_FILTERS_DEFAULTS,
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSortBy: (sort) => set({ sortBy: sort }),
      setShowUnavailable: (show) => set({ showUnavailable: show }),
      setSourceFilter: (filter) => set({ sourceFilter: filter }),
      resetFilters: () => set(RUNNER_FILTERS_DEFAULTS),
    }),
    {
      name: 'settings-runners-filters',
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        sortBy: state.sortBy,
        showUnavailable: state.showUnavailable,
        sourceFilter: state.sourceFilter,
      }),
    }
  )
);
