/**
 * Desktop App Entry Point - Wraps @leanspec/ui with desktop-specific shell
 * 
 * This component provides:
 * - Desktop-specific title bar with project switcher
 * - Window controls (minimize, maximize, close)
 * - Projects management modal
 * - Desktop state management (projects, active project)
 * 
 * The actual UI pages come from @leanspec/ui
 */

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  createHashRouter,
  RouterProvider,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  KeyboardShortcutsProvider,
  ChatProvider,
} from '@leanspec/ui/src/contexts';
import { queryClient } from '@leanspec/ui/src/lib/query-client';
import { useProjectMutations } from '@leanspec/ui/src/hooks/useProjectQuery';
import { Layout } from '@leanspec/ui/src/components/layout';
import { Navigation } from '@leanspec/ui/src/components/navigation';
import { ProjectsPage } from '@leanspec/ui/src/pages/ProjectsPage';
import { createProjectRoutes } from '@leanspec/ui/src/router/projectRoutes';
import { useProjects } from './hooks/useProjects';
import { DesktopProjectProvider } from './contexts/DesktopProjectContext';
import DesktopLayout from './components/DesktopLayout';
import WindowControls from './components/WindowControls';
import styles from './app.module.css';

const DesktopNavigationFrame = ({ children }: { children: ReactNode }) => (
  <DesktopLayout>
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation
        rightSlot={<WindowControls />}
        onHeaderDoubleClick={async () => {
          const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
          const desktopWindow = WebviewWindow.getCurrent();
          await desktopWindow.toggleMaximize();
        }}
      />
      <main className="flex-1 w-full min-h-[calc(100vh-3.5rem)]">{children}</main>
    </div>
  </DesktopLayout>
);

function DesktopRootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  const { switchProject: switchUiProject } = useProjectMutations();

  const {
    projects,
    activeProjectId,
    loading,
    error,
    switchProject: switchDesktopProject,
    addProject,
  } = useProjects();

  const pendingNavigateToActiveProject = useRef(false);
  const navigationRightSlot = <WindowControls />;

  const effectiveProjectId = useMemo(() => {
    if (projectId) return projectId;
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

  useEffect(() => {
    if (loading) return;

    if (!projectId) {
      if (effectiveProjectId) {
        navigate(replaceProjectInPath(effectiveProjectId), { replace: true });
      } else {
        navigate('/projects', { replace: true });
      }
      return;
    }
  }, [effectiveProjectId, loading, navigate, projectId]);

  // Keep desktop backend active project and ui ProjectContext in sync with the route.
  useEffect(() => {
    if (loading) return;
    if (!effectiveProjectId) return;

    // Sync desktop shell / tray state.
    if (effectiveProjectId !== activeProjectId) {
      void switchDesktopProject(effectiveProjectId);
    }

    // Sync ui data fetching (api.setCurrentProjectId).
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
        <Layout
          className="min-h-0 min-w-0"
          navigationRightSlot={navigationRightSlot}
          onNavigationDoubleClick={async () => {
            const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
            const desktopWindow = WebviewWindow.getCurrent();
            await desktopWindow.toggleMaximize();
          }}
        />
      </DesktopLayout>
    </DesktopProjectProvider>
  );
}

function DesktopProjectsLayout() {
  const {
    projects,
    activeProjectId,
    loading,
    error,
    switchProject: switchDesktopProject,
  } = useProjects();

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
      projectId={activeProjectId || projects[0]?.id || ''}
      projects={projects}
      onSwitchProject={switchDesktopProject}
    >
      <DesktopNavigationFrame>
        <ProjectsPage />
      </DesktopNavigationFrame>
    </DesktopProjectProvider>
  );
}

// Create router with ui pages but desktop layout
// Use hash router for Tauri to avoid issues with file:// protocol
const router = createHashRouter([
  {
    path: '/',
    element: <Navigate to="/projects" replace />,
  },
  {
    path: '/projects',
    element: <DesktopProjectsLayout />,
  },
  {
    path: '/projects/:projectId',
    element: <DesktopRootLayout />,
    children: createProjectRoutes(),
  },
]);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <KeyboardShortcutsProvider>
        <ChatProvider>
          <RouterProvider router={router} />
        </ChatProvider>
      </KeyboardShortcutsProvider>
    </QueryClientProvider>
  );
};

export default App;
