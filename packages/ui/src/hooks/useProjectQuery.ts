import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Project, ProjectValidationResponse, ProjectsResponse } from '../types/api';
import { useMachineStore } from '../stores/machine';
import { rehydrateProjectScopedStores } from '../lib/project-store-sync';

const STORAGE_KEY = 'leanspec-current-project';

export const projectKeys = {
  all: ['projects'] as const,
  list: (scopeKey: string) => [...projectKeys.all, 'list', scopeKey] as const,
};

function getStorageKey(machineModeEnabled: boolean, machineId?: string | null) {
  if (machineModeEnabled && machineId) {
    return `${STORAGE_KEY}:${machineId}`;
  }
  return STORAGE_KEY;
}

export function useProjects() {
  const { machineModeEnabled, currentMachine } = useMachineStore();
  const storageKey = useMemo(
    () => getStorageKey(machineModeEnabled, currentMachine?.id),
    [machineModeEnabled, currentMachine?.id]
  );

  const query = useQuery({
    queryKey: projectKeys.list(storageKey),
    queryFn: () => api.getProjects(),
    staleTime: 30 * 1000,
  });

  const projects = useMemo(() => {
    const data = query.data as ProjectsResponse | undefined;
    return data?.projects ?? [];
  }, [query.data]);

  const favoriteProjects = useMemo(
    () => projects.filter((project) => project.favorite),
    [projects]
  );

  return {
    ...query,
    projects,
    availableProjects: projects,
    favoriteProjects,
    storageKey,
  };
}

export function useCurrentProject() {
  const { projects, isLoading, error, storageKey } = useProjects();
  const currentProjectId = typeof window === 'undefined'
    ? null
    : sessionStorage.getItem(storageKey) ?? localStorage.getItem(storageKey);

  const currentProject = useMemo(() => {
    if (projects.length === 0) return null;
    if (currentProjectId) {
      const stored = projects.find((project) => project.id === currentProjectId);
      if (stored) return stored;
    }
    return projects[0] ?? null;
  }, [projects, currentProjectId]);

  useEffect(() => {
    if (typeof window === 'undefined' || isLoading) return;
    if (currentProject?.id) {
      sessionStorage.setItem(storageKey, currentProject.id);
      api.setCurrentProjectId(currentProject.id);
    } else {
      sessionStorage.removeItem(storageKey);
      api.setCurrentProjectId(null);
    }
  }, [currentProject?.id, isLoading, storageKey]);

  return {
    currentProject,
    loading: isLoading,
    error,
    storageKey,
  };
}

export function useProjectMutations() {
  const queryClient = useQueryClient();
  const { projects, storageKey } = useProjects();

  const switchProject = async (projectId: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(storageKey, projectId);
    }
    api.setCurrentProjectId(projectId);
    // Rehydrate stores before query invalidation triggers re-renders
    rehydrateProjectScopedStores();
    await queryClient.invalidateQueries({ queryKey: projectKeys.list(storageKey) });
  };

  const addProject = async (
    path: string,
    options?: { favorite?: boolean; color?: string; name?: string; description?: string | null }
  ) => {
    const project = await api.createProject(path, options);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(storageKey, project.id);
    }
    api.setCurrentProjectId(project.id);
    await queryClient.invalidateQueries({ queryKey: projectKeys.list(storageKey) });
    return project;
  };

  const updateProject = async (
    projectId: string,
    updates: Partial<Pick<Project, 'name' | 'color' | 'favorite' | 'description'>>
  ) => {
    const updated = await api.updateProject(projectId, updates);
    await queryClient.invalidateQueries({ queryKey: projectKeys.list(storageKey) });
    return updated;
  };

  const removeProject = async (projectId: string) => {
    await api.deleteProject(projectId);
    const currentId = typeof window !== 'undefined' ? sessionStorage.getItem(storageKey) : null;
    if (currentId === projectId && typeof window !== 'undefined') {
      sessionStorage.removeItem(storageKey);
    }
    await queryClient.invalidateQueries({ queryKey: projectKeys.list(storageKey) });
  };

  const toggleFavorite = async (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    const nextFavorite = !(project?.favorite ?? false);
    await updateProject(projectId, { favorite: nextFavorite });
  };

  const validateProject = async (projectId: string): Promise<ProjectValidationResponse> => {
    return api.validateProject(projectId);
  };

  return {
    switchProject,
    addProject,
    updateProject,
    removeProject,
    toggleFavorite,
    validateProject,
  };
}
