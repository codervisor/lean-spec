/**
 * Zustand store for Specs page/sidebar preferences.
 * Uses persist middleware for automatic localStorage sync.
 * 
 * Consolidates all specs-related UI state that should persist across sessions:
 * - Sidebar filters (status, priority, tags)
 * - Sort preferences
 * - View mode (list/tree for sidebar, list/board for page)
 * - Show archived toggle
 * - Expanded tree nodes
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export type SpecsSortOption = 'id-desc' | 'id-asc' | 'updated-desc' | 'title-asc' | 'title-desc' | 'priority-desc' | 'priority-asc';
export type SpecsViewMode = 'list' | 'board';
export type SidebarViewMode = 'list' | 'tree';

interface SpecsPreferencesState {
  // Filters (shared between sidebar and page)
  statusFilter: string[];
  priorityFilter: string[];
  tagFilter: string[];

  // Sort
  sortBy: SpecsSortOption;

  // View preferences
  hierarchyView: boolean;  // true = tree/hierarchy mode
  showArchived: boolean;
  pageViewMode: SpecsViewMode;  // list or board view on specs page
  showValidationIssuesOnly: boolean;

  // UI state
  expandedNodeIds: string[];

  // Actions
  setStatusFilter: (filter: string[]) => void;
  setPriorityFilter: (filter: string[]) => void;
  setTagFilter: (filter: string[]) => void;
  setSortBy: (sort: SpecsSortOption) => void;
  setHierarchyView: (enabled: boolean) => void;
  setShowArchived: (show: boolean) => void;
  setPageViewMode: (mode: SpecsViewMode) => void;
  setShowValidationIssuesOnly: (show: boolean) => void;
  setExpandedNodeIds: (ids: string[]) => void;
  toggleExpandedNode: (id: string) => void;
  clearFilters: () => void;
}

const DEFAULTS = {
  statusFilter: [] as string[],
  priorityFilter: [] as string[],
  tagFilter: [] as string[],
  sortBy: 'id-desc' as SpecsSortOption,
  hierarchyView: false,
  showArchived: false,
  pageViewMode: 'list' as SpecsViewMode,
  showValidationIssuesOnly: false,
  expandedNodeIds: [] as string[],
};

export const useSpecsPreferencesStore = create<SpecsPreferencesState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,

      setStatusFilter: (filter) => set({ statusFilter: filter }),
      setPriorityFilter: (filter) => set({ priorityFilter: filter }),
      setTagFilter: (filter) => set({ tagFilter: filter }),
      setSortBy: (sort) => set({ sortBy: sort }),
      setHierarchyView: (enabled) => set({ hierarchyView: enabled }),
      setShowArchived: (show) => set({ showArchived: show }),
      setPageViewMode: (mode) => set({ pageViewMode: mode }),
      setShowValidationIssuesOnly: (show) => set({ showValidationIssuesOnly: show }),
      setExpandedNodeIds: (ids) => set({ expandedNodeIds: ids }),

      toggleExpandedNode: (id) => {
        const current = get().expandedNodeIds;
        const isExpanded = current.includes(id);
        set({
          expandedNodeIds: isExpanded
            ? current.filter((nodeId) => nodeId !== id)
            : [...current, id],
        });
      },

      clearFilters: () => set({
        statusFilter: [],
        priorityFilter: [],
        tagFilter: [],
      }),
    }),
    {
      name: 'leanspec:specs:preferences',
      partialize: (state) => ({
        statusFilter: state.statusFilter,
        priorityFilter: state.priorityFilter,
        tagFilter: state.tagFilter,
        sortBy: state.sortBy,
        hierarchyView: state.hierarchyView,
        showArchived: state.showArchived,
        pageViewMode: state.pageViewMode,
        showValidationIssuesOnly: state.showValidationIssuesOnly,
        expandedNodeIds: state.expandedNodeIds,
      }),
    }
  )
);

// ============================================================================
// Sidebar Collapsed State
// ============================================================================

interface SpecsSidebarState {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

export const useSpecsSidebarStore = create<SpecsSidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      setCollapsed: (collapsed) => set({ collapsed }),
      toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
    }),
    {
      name: 'leanspec:ui:sidebarCollapsed',
    }
  )
);
