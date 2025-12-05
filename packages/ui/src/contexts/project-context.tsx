/**
 * Project Context
 * Manages the current project state for multi-project mode
 * 
 * Architecture: Project-centric, mode-agnostic
 * - Single-project mode is treated as having one project with DEFAULT_PROJECT_ID
 * - Multi-project mode has multiple explicit projects
 * - Components receive projectId, mode is derived internally
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { LocalProject } from '@/lib/projects/types';
import { DEFAULT_PROJECT_ID, isDefaultProject, normalizeProjectId } from '@/lib/projects/constants';

// Re-export for convenience
export { DEFAULT_PROJECT_ID, isDefaultProject, normalizeProjectId };

interface ProjectContextType {
  mode: 'multi-project' | 'single-project';
  currentProject: LocalProject | null;
  projects: LocalProject[];
  recentProjects: LocalProject[];
  favoriteProjects: LocalProject[];
  isLoading: boolean;
  error: string | null;
  /** Current project ID, or 'default' for single-project mode */
  currentProjectId: string;
  switchProject: (projectId: string) => Promise<void>;
  addProject: (path: string, options?: { favorite?: boolean; color?: string }) => Promise<LocalProject>;
  removeProject: (projectId: string) => Promise<void>;
  toggleFavorite: (projectId: string) => Promise<void>;
  updateProject: (projectId: string, updates: Partial<Pick<LocalProject, 'name' | 'color' | 'description'>>) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider');
  }
  return context;
}

interface ProjectProviderProps {
  children: React.ReactNode;
  initialProjectId?: string;
}

export function ProjectProvider({ children, initialProjectId }: ProjectProviderProps) {
  const [mode, setMode] = useState<'multi-project' | 'single-project'>('single-project');
  const [currentProject, setCurrentProject] = useState<LocalProject | null>(null);
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [recentProjects, setRecentProjects] = useState<LocalProject[]>([]);
  const [favoriteProjects, setFavoriteProjects] = useState<LocalProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all projects
  const refreshProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      setMode(data.mode || 'single-project');
      setProjects(data.projects || []);
      setRecentProjects(data.recentProjects || []);
      setFavoriteProjects(data.favoriteProjects || []);

      // Set current project if not already set
      if (!currentProject && data.projects.length > 0) {
        const projectToSet = initialProjectId 
          ? data.projects.find((p: LocalProject) => p.id === initialProjectId)
          : data.recentProjects?.[0] || data.projects[0];
        
        if (projectToSet) {
          setCurrentProject(projectToSet);
        }
      }
    } catch (err: unknown) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, [currentProject, initialProjectId]);

  // Switch to a different project
  const switchProject = useCallback(async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }

      const data = await response.json();
      setCurrentProject(data.project);

      // Refresh recent projects list
      await refreshProjects();
    } catch (err: unknown) {
      console.error('Error switching project:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch project');
      throw err;
    }
  }, [refreshProjects]);

  // Add a new project
  const addProject = useCallback(async (
    path: string,
    options?: { favorite?: boolean; color?: string }
  ): Promise<LocalProject> => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, ...options }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to add project');
      }

      const data = await response.json();
      await refreshProjects();
      return data.project;
    } catch (err: unknown) {
      console.error('Error adding project:', err);
      setError(err instanceof Error ? err.message : 'Failed to add project');
      throw err;
    }
  }, [refreshProjects]);

  // Remove a project
  const removeProject = useCallback(async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove project');
      }

      // If we removed the current project, switch to another
      if (currentProject?.id === projectId) {
        const otherProject = projects.find((p) => p.id !== projectId);
        setCurrentProject(otherProject || null);
      }

      await refreshProjects();
    } catch (err: unknown) {
      console.error('Error removing project:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove project');
      throw err;
    }
  }, [currentProject, projects, refreshProjects]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle favorite');
      }

      await refreshProjects();
    } catch (err: unknown) {
      console.error('Error toggling favorite:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle favorite');
      throw err;
    }
  }, [refreshProjects]);

  // Update project metadata
  const updateProject = useCallback(async (
    projectId: string,
    updates: Partial<Pick<LocalProject, 'name' | 'color' | 'description'>>
  ) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      await refreshProjects();
    } catch (err: unknown) {
      console.error('Error updating project:', err);
      setError(err instanceof Error ? err.message : 'Failed to update project');
      throw err;
    }
  }, [refreshProjects]);

  // Load projects on mount
  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // Compute currentProjectId - always have a value for consistency
  const currentProjectId = currentProject?.id || 'default';

  const value: ProjectContextType = {
    mode,
    currentProject,
    projects,
    recentProjects,
    favoriteProjects,
    isLoading,
    error,
    currentProjectId,
    switchProject,
    addProject,
    removeProject,
    toggleFavorite,
    updateProject,
    refreshProjects,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

/**
 * Hook to generate project-scoped URLs
 * 
 * Phase 3 of spec 151: Always generate project-scoped URLs
 * In single-project mode, uses 'default' as the project ID
 * Returns currentProjectId which is always defined (uses 'default' for single-project mode)
 */
export function useProjectUrl() {
  const { mode, currentProject, currentProjectId } = useProject();
  
  const getUrl = useCallback((path: string) => {
    // Always use project-scoped URLs
    const projectId = currentProject?.id || DEFAULT_PROJECT_ID;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `/projects/${projectId}${normalizedPath}`;
  }, [currentProject]);

  const getSpecUrl = useCallback((specId: string | number, subSpec?: string) => {
    const base = getUrl(`/specs/${specId}`);
    return subSpec ? `${base}?subspec=${subSpec}` : base;
  }, [getUrl]);

  return { 
    getUrl, 
    getSpecUrl, 
    isMultiProject: mode === 'multi-project', 
    projectId: currentProjectId,  // Always defined, 'default' for single-project
  };
}
