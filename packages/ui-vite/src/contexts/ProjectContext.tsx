import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { Project, ProjectValidationResponse, ProjectsResponse } from '../types/api';

interface ProjectContextValue {
  currentProject: Project | null;
  projects: Project[];
  availableProjects: Project[];
  favoriteProjects: Project[];
  loading: boolean;
  error: string | null;
  switchProject: (projectId: string) => Promise<void>;
  addProject: (
    path: string,
    options?: { favorite?: boolean; color?: string; name?: string; description?: string | null }
  ) => Promise<Project>;
  updateProject: (
    projectId: string,
    updates: Partial<Pick<Project, 'name' | 'color' | 'favorite' | 'description'>>
  ) => Promise<Project | undefined>;
  removeProject: (projectId: string) => Promise<void>;
  toggleFavorite: (projectId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
  validateProject: (projectId: string) => Promise<ProjectValidationResponse>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const STORAGE_KEY = 'leanspec-current-project';

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [favoriteProjects, setFavoriteProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyProjects = useCallback((data: ProjectsResponse) => {
    const normalized = data.available || [];
    setProjects(normalized);
    setFavoriteProjects(normalized.filter((project: Project) => project.favorite));

    const storedId = localStorage.getItem(STORAGE_KEY);
    const nextCurrent = data.current
      || (storedId ? normalized.find((p: Project) => p.id === storedId) || null : null)
      || normalized[0]
      || null;

    setCurrentProject(nextCurrent);
    if (nextCurrent) {
      localStorage.setItem(STORAGE_KEY, nextCurrent.id);
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: ProjectsResponse = await api.getProjects();
      applyProjects(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [applyProjects]);

  const switchProject = useCallback(async (projectId: string) => {
    if (projectId === currentProject?.id) return;

    setLoading(true);
    setError(null);
    try {
      localStorage.setItem(STORAGE_KEY, projectId);
      const data: ProjectsResponse = await api.getProjects();
      applyProjects(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to switch project';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [applyProjects, currentProject?.id]);

  const addProject = useCallback(async (
    path: string,
    options?: { favorite?: boolean; color?: string; name?: string; description?: string | null }
  ): Promise<Project> => {
    setError(null);
    const project = await api.createProject(path, options);
    await refreshProjects();
    await switchProject(project.id);
    return project;
  }, [refreshProjects, switchProject]);

  const updateProject = useCallback(async (
    projectId: string,
    updates: Partial<Pick<Project, 'name' | 'color' | 'favorite' | 'description'>>
  ) => {
    setError(null);
    const updated = await api.updateProject(projectId, updates);
    await refreshProjects();
    return updated;
  }, [refreshProjects]);

  const removeProject = useCallback(async (projectId: string) => {
    setError(null);
    await api.deleteProject(projectId);
    if (currentProject?.id === projectId) {
      localStorage.removeItem(STORAGE_KEY);
    }
    await refreshProjects();
  }, [currentProject?.id, refreshProjects]);

  const toggleFavorite = useCallback(async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    const nextFavorite = !(project?.favorite ?? false);
    await updateProject(projectId, { favorite: nextFavorite });
  }, [projects, updateProject]);

  const validateProject = useCallback(async (projectId: string) => {
    return api.validateProject(projectId);
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        projects,
        availableProjects: projects,
        favoriteProjects,
        loading,
        error,
        switchProject,
        addProject,
        updateProject,
        removeProject,
        toggleFavorite,
        refreshProjects,
        validateProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
