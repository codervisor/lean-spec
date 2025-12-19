import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, type Project, type ProjectsResponse } from '../lib/api';

interface ProjectContextValue {
  currentProject: Project | null;
  availableProjects: Project[];
  loading: boolean;
  error: string | null;
  switchProject: (projectId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const STORAGE_KEY = 'leanspec-current-project';

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: ProjectsResponse = await api.getProjects();
      setCurrentProject(data.current);
      setAvailableProjects(data.available);
      
      // Persist current project to localStorage
      if (data.current) {
        localStorage.setItem(STORAGE_KEY, data.current.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const switchProject = useCallback(async (projectId: string) => {
    if (projectId === currentProject?.id) return;
    
    setLoading(true);
    setError(null);
    try {
      await api.switchProject(projectId);
      localStorage.setItem(STORAGE_KEY, projectId);
      // Reload projects to get updated current project
      await loadProjects();
    } catch (err: any) {
      setError(err.message || 'Failed to switch project');
      throw err;
    }
  }, [currentProject?.id, loadProjects]);

  // Initial load
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        availableProjects,
        loading,
        error,
        switchProject,
        refreshProjects: loadProjects,
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
