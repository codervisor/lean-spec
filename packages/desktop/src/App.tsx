/**
 * Desktop App Entry Point - Wraps @leanspec/ui-vite with desktop-specific shell
 * 
 * This component provides:
 * - Desktop-specific title bar with project switcher
 * - Window controls (minimize, maximize, close)
 * - Projects management modal
 * - Desktop state management (projects, active project)
 * 
 * The actual UI pages come from @leanspec/ui-vite
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  createHashRouter,
  RouterProvider,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { ThemeProvider, KeyboardShortcutsProvider, ProjectProvider, useProject } from '@leanspec/ui-vite/src/contexts';
import { Layout } from '@leanspec/ui-vite/src/components/Layout';
import { Navigation } from '@leanspec/ui-vite/src/components/Navigation';
import { DashboardPage } from '@leanspec/ui-vite/src/pages/DashboardPage';
import { SpecsPage } from '@leanspec/ui-vite/src/pages/SpecsPage';
import { SpecDetailPage } from '@leanspec/ui-vite/src/pages/SpecDetailPage';
import { StatsPage } from '@leanspec/ui-vite/src/pages/StatsPage';
import { DependenciesPage } from '@leanspec/ui-vite/src/pages/DependenciesPage';
import { ContextPage } from '@leanspec/ui-vite/src/pages/ContextPage';
import { useProjects } from './hooks/useProjects';
import { DesktopProjectProvider } from './contexts/DesktopProjectContext';
import DesktopLayout from './components/DesktopLayout';
import { ProjectsManager } from './components/ProjectsManager';
import WindowControls from './components/WindowControls';
import styles from './app.module.css';

const DesktopNavigationFrame = ({ children }: { children: ReactNode }) => (
  <DesktopLayout>
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation rightSlot={<WindowControls />} />
      <main className="flex-1 w-full min-h-[calc(100vh-3.5rem)]">{children}</main>
    </div>
  </DesktopLayout>
);

function DesktopRootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  const {
    projects,
    activeProjectId,
    loading,
    error,
    switchProject: switchDesktopProject,
    addProject,
    refreshProjects,
    toggleFavorite,
    removeProject,
    renameProject,
  } = useProjects();

  const { switchProject: switchUiProject } = useProject();
  
  const [projectsManagerOpen, setProjectsManagerOpen] = useState(false);
  const pendingNavigateToActiveProject = useRef(false);
  const navigationRightSlot = <WindowControls />;

  const effectiveProjectId = useMemo(() => {
    if (projectId && projectId !== 'default') return projectId;
    return activeProjectId || projects[0]?.id;
  }, [activeProjectId, projectId, projects]);

  const replaceProjectInPath = (nextProjectId: string) => {
    const match = location.pathname.match(/^\/projects\/([^/]+)(\/.*)?$/);
    const current = match?.[1];
    const rest = match?.[2] ?? '';
    const nextRest = rest && rest !== '/' ? rest : '/specs';

    if (current) {
      return location.pathname.replace(`/projects/${current}`, `/projects/${nextProjectId}`) + location.search;
    }

    return `/projects/${nextProjectId}${nextRest}${location.search}`;
  };

  // Desktop uses a route alias like ui-vite: `/projects/default`.
  // Once desktop state is loaded, normalize it to the real active project id.
  useEffect(() => {
    if (loading) return;

    if (!projectId) {
      navigate('/projects/default', { replace: true });
      return;
    }

    if (projectId === 'default' && effectiveProjectId) {
      navigate(replaceProjectInPath(effectiveProjectId), { replace: true });
    }
  }, [effectiveProjectId, loading, navigate, projectId]);

  // Keep desktop backend active project and ui-vite ProjectContext in sync with the route.
  useEffect(() => {
    if (loading) return;
    if (!effectiveProjectId) return;

    // Sync desktop shell / tray state.
    if (effectiveProjectId !== activeProjectId) {
      void switchDesktopProject(effectiveProjectId);
    }

    // Sync ui-vite data fetching (api.setCurrentProjectId).
    void switchUiProject(effectiveProjectId);
  }, [activeProjectId, effectiveProjectId, loading, switchDesktopProject, switchUiProject]);

  // If user just added a project (native picker), jump to the newly active project.
  useEffect(() => {
    if (!pendingNavigateToActiveProject.current) return;
    if (loading) return;
    if (!activeProjectId) return;

    pendingNavigateToActiveProject.current = false;
    navigate(replaceProjectInPath(activeProjectId), { replace: false });
  }, [activeProjectId, loading, navigate]);

  // Handle keyboard shortcuts for projects manager
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        setProjectsManagerOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <DesktopNavigationFrame>
        <div className={styles.centerState}>Loading desktop environment…</div>
      </DesktopNavigationFrame>
    );
  }

  if (error) {
    return (
      <DesktopNavigationFrame>
        <div className={styles.errorState}>
          <div style={{ fontSize: '1.2em', fontWeight: 600 }}>Unable to load projects</div>
          <div>{error}</div>
        </div>
      </DesktopNavigationFrame>
    );
  }

  if (!effectiveProjectId) {
    return (
      <DesktopNavigationFrame>
        <div className={styles.centerState}>
          <p>No project selected.</p>
          <button
            onClick={async () => {
              pendingNavigateToActiveProject.current = true;
              await addProject();
            }}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            Open a project
          </button>
        </div>
      </DesktopNavigationFrame>
    );
  }

  return (
    <DesktopProjectProvider 
      projectId={effectiveProjectId}
      projects={projects}
      onSwitchProject={switchDesktopProject}
    >
      <DesktopLayout>
        {projectsManagerOpen && (
          <ProjectsManager
            projects={projects}
            activeProjectId={effectiveProjectId}
            onClose={() => setProjectsManagerOpen(false)}
            onOpenProject={(nextId) => {
              navigate(replaceProjectInPath(nextId));
              setProjectsManagerOpen(false);
            }}
            onAddProject={async () => {
              pendingNavigateToActiveProject.current = true;
              await addProject();
            }}
            onRefresh={refreshProjects}
            onToggleFavorite={toggleFavorite}
            onRemoveProject={removeProject}
            onRenameProject={renameProject}
          />
        )}
        <Layout className="min-h-0 min-w-0" navigationRightSlot={navigationRightSlot} />
      </DesktopLayout>
    </DesktopProjectProvider>
  );
}

function DesktopProjectsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    projects,
    activeProjectId,
    loading,
    error,
    switchProject: switchDesktopProject,
    addProject,
    refreshProjects,
    toggleFavorite,
    removeProject,
    renameProject,
  } = useProjects();

  const pendingNavigateToActiveProject = useRef(false);

  const goToProject = (projectId: string) => {
    navigate(`/projects/${projectId}/specs${location.search}`);
  };

  if (loading) {
    return (
      <DesktopNavigationFrame>
        <div className={styles.centerState}>Loading desktop environment…</div>
      </DesktopNavigationFrame>
    );
  }

  if (error) {
    return (
      <DesktopNavigationFrame>
        <div className={styles.errorState}>
          <div style={{ fontSize: '1.2em', fontWeight: 600 }}>Unable to load projects</div>
          <div>{error}</div>
        </div>
      </DesktopNavigationFrame>
    );
  }

  return (
    <DesktopProjectProvider
      projectId={activeProjectId || projects[0]?.id || 'default'}
      projects={projects}
      onSwitchProject={switchDesktopProject}
    >
      <DesktopNavigationFrame>
        <ProjectsManager
          projects={projects}
          activeProjectId={activeProjectId}
          onClose={() => {
            if (activeProjectId) {
              goToProject(activeProjectId);
            } else {
              navigate('/projects/default');
            }
          }}
          onOpenProject={(id) => goToProject(id)}
          onAddProject={async () => {
            pendingNavigateToActiveProject.current = true;
            await addProject();
          }}
          onRefresh={refreshProjects}
          onToggleFavorite={toggleFavorite}
          onRemoveProject={removeProject}
          onRenameProject={renameProject}
        />
      </DesktopNavigationFrame>
    </DesktopProjectProvider>
  );
}

// Create router with ui-vite pages but desktop layout
// Use hash router for Tauri to avoid issues with file:// protocol
const router = createHashRouter([
  {
    path: '/',
    element: <Navigate to="/projects/default" replace />,
  },
  {
    path: '/projects',
    element: <DesktopProjectsLayout />,
  },
  {
    path: '/projects/:projectId',
    element: <DesktopRootLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'specs',
        children: [
          { index: true, element: <SpecsPage /> },
          { path: ':specName', element: <SpecDetailPage /> },
        ],
      },
      { path: 'stats', element: <StatsPage /> },
      { path: 'dependencies', element: <DependenciesPage /> },
      { path: 'dependencies/:specName', element: <DependenciesPage /> },
      { path: 'context', element: <ContextPage /> },
    ],
  },
]);

const App = () => {
  return (
    <ThemeProvider>
      <ProjectProvider>
        <KeyboardShortcutsProvider>
          <RouterProvider router={router} />
        </KeyboardShortcutsProvider>
      </ProjectProvider>
    </ThemeProvider>
  );
};

export default App;
