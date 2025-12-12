import { useState, useCallback, useMemo, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { DesktopProject } from '../types';

export type ValidationStatus = 'unknown' | 'validating' | 'valid' | 'invalid';

export interface ProjectValidationState {
  status: ValidationStatus;
  error?: string;
}

export type ViewMode = 'grid' | 'list';
export type SortOption = 'name' | 'lastAccessed' | 'specCount';
export type FilterTab = 'all' | 'favorites' | 'recent';

interface UseProjectsManagerState {
  searchQuery: string;
  viewMode: ViewMode;
  sortBy: SortOption;
  filterTab: FilterTab;
  validationStates: Record<string, ProjectValidationState>;
}

const VIEW_MODE_KEY = 'leanspec-projects-view-mode';
const SORT_BY_KEY = 'leanspec-projects-sort-by';

export function useProjectsManager(projects: DesktopProject[]) {
  const [state, setState] = useState<UseProjectsManagerState>(() => ({
    searchQuery: '',
    viewMode: (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || 'grid',
    sortBy: (localStorage.getItem(SORT_BY_KEY) as SortOption) || 'lastAccessed',
    filterTab: 'all',
    validationStates: {},
  }));

  const setSearchQuery = useCallback((searchQuery: string) => {
    setState((prev) => ({ ...prev, searchQuery }));
  }, []);

  const setViewMode = useCallback((viewMode: ViewMode) => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
    setState((prev) => ({ ...prev, viewMode }));
  }, []);

  const setSortBy = useCallback((sortBy: SortOption) => {
    localStorage.setItem(SORT_BY_KEY, sortBy);
    setState((prev) => ({ ...prev, sortBy }));
  }, []);

  const setFilterTab = useCallback((filterTab: FilterTab) => {
    setState((prev) => ({ ...prev, filterTab }));
  }, []);

  const setValidationState = useCallback((projectId: string, validationState: ProjectValidationState) => {
    setState((prev) => ({
      ...prev,
      validationStates: {
        ...prev.validationStates,
        [projectId]: validationState,
      },
    }));
  }, []);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    // Apply tab filter
    if (state.filterTab === 'favorites') {
      filtered = filtered.filter((p) => p.favorite);
    }

    if (state.filterTab === 'recent') {
      filtered.sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
      filtered = filtered.slice(0, 20);
    }

    // Apply search filter
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.path.toLowerCase().includes(query)
      );
    }

    // Apply sorting (keep recent tab pinned to lastAccessed)
    if (state.filterTab !== 'recent') {
      filtered.sort((a, b) => {
        switch (state.sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'lastAccessed':
            return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
          case 'specCount':
            // TODO: When we have spec counts from validation
            return 0;
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [projects, state.searchQuery, state.sortBy, state.filterTab]);

  // Auto-validate projects on load
  useEffect(() => {
    const validateProjects = async () => {
      for (const project of projects) {
        // Skip if already validated or validating
        const currentState = state.validationStates[project.id];
        if (currentState?.status === 'valid' || currentState?.status === 'invalid' || currentState?.status === 'validating') {
          continue;
        }

        setValidationState(project.id, { status: 'validating' });

        try {
          // Check if path exists by trying to access the specs dir
          const isValid = await invoke<boolean>('desktop_validate_project', { projectId: project.id });
          setValidationState(project.id, { 
            status: isValid ? 'valid' : 'invalid',
            error: isValid ? undefined : 'Path not accessible'
          });
        } catch (error) {
          setValidationState(project.id, {
            status: 'invalid',
            error: error instanceof Error ? error.message : 'Validation failed',
          });
        }
      }
    };

    if (projects.length > 0) {
      validateProjects();
    }
  }, [projects]);

  const validateProject = useCallback(async (projectId: string) => {
    setValidationState(projectId, { status: 'validating' });

    try {
      const isValid = await invoke<boolean>('desktop_validate_project', { projectId });
      setValidationState(projectId, {
        status: isValid ? 'valid' : 'invalid',
        error: isValid ? undefined : 'Path not accessible',
      });
      return isValid;
    } catch (error) {
      setValidationState(projectId, {
        status: 'invalid',
        error: error instanceof Error ? error.message : 'Validation failed',
      });
      return false;
    }
  }, [setValidationState]);

  const validateAllProjects = useCallback(async () => {
    for (const project of projects) {
      await validateProject(project.id);
    }
  }, [projects, validateProject]);

  return {
    ...state,
    filteredProjects,
    setSearchQuery,
    setViewMode,
    setSortBy,
    setFilterTab,
    setValidationState,
    validateProject,
    validateAllProjects,
    projectCount: projects.length,
    favoriteCount: projects.filter((p) => p.favorite).length,
    recentCount: Math.min(20, projects.length),
  };
}
