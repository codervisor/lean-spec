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

import { useCallback, useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider, KeyboardShortcutsProvider } from '@leanspec/ui-vite/src/contexts';
import { SpecsPage } from '@leanspec/ui-vite/src/pages/SpecsPage';
import { SpecDetailPage } from '@leanspec/ui-vite/src/pages/SpecDetailPage';
import { StatsPage } from '@leanspec/ui-vite/src/pages/StatsPage';
import { DependenciesPage } from '@leanspec/ui-vite/src/pages/DependenciesPage';
import { useProjects } from './hooks/useProjects';
import { DesktopProjectProvider } from './contexts/DesktopProjectContext';
import DesktopLayout from './components/DesktopLayout';
import TitleBar from './components/TitleBar';
import { ProjectsManager } from './components/ProjectsManager';
import styles from './app.module.css';

function DesktopRootLayout() {
  const {
    projects,
    activeProjectId,
    loading,
    error,
    switchProject,
    addProject,
    refreshProjects,
    toggleFavorite,
    removeProject,
    renameProject,
  } = useProjects();
  
  const [projectsManagerOpen, setProjectsManagerOpen] = useState(false);

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
      <DesktopLayout header={
        <TitleBar 
          projects={[]} 
          activeProjectId={undefined} 
          onProjectSelect={() => {}} 
          onAddProject={() => {}} 
          onRefresh={() => {}} 
          onManageProjects={() => {}} 
          isLoading={true} 
        />
      }>
        <div className={styles.centerState}>Loading desktop environment…</div>
      </DesktopLayout>
    );
  }

  if (error) {
    return (
      <DesktopLayout header={
        <TitleBar 
          projects={[]} 
          activeProjectId={undefined} 
          onProjectSelect={() => {}} 
          onAddProject={() => {}} 
          onRefresh={() => {}} 
          onManageProjects={() => {}} 
          isLoading={false} 
        />
      }>
        <div className={styles.errorState}>
          <div style={{ fontSize: '1.2em', fontWeight: 600 }}>Unable to load projects</div>
          <div>{error}</div>
        </div>
      </DesktopLayout>
    );
  }

  if (!activeProjectId) {
    return (
      <DesktopLayout 
        header={
          <TitleBar 
            projects={projects} 
            activeProjectId={undefined} 
            onProjectSelect={switchProject} 
            onAddProject={addProject} 
            onRefresh={refreshProjects} 
            onManageProjects={() => setProjectsManagerOpen(true)}
            isLoading={false}
          />
        }
      >
        <div className={styles.centerState}>
          <p>No project selected.</p>
          <button onClick={addProject} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            Open a project
          </button>
        </div>
      </DesktopLayout>
    );
  }

  return (
    <DesktopProjectProvider 
      projectId={activeProjectId}
      projects={projects}
      onSwitchProject={switchProject}
    >
      <DesktopLayout 
        header={
          <TitleBar 
            projects={projects} 
            activeProjectId={activeProjectId} 
            onProjectSelect={switchProject} 
            onAddProject={addProject} 
            onRefresh={refreshProjects} 
            onManageProjects={() => setProjectsManagerOpen(true)}
            isLoading={false}
          />
        }
      >
        {projectsManagerOpen && (
          <ProjectsManager
            projects={projects}
            activeProjectId={activeProjectId}
            onClose={() => setProjectsManagerOpen(false)}
            onOpenProject={(projectId) => {
              switchProject(projectId);
              setProjectsManagerOpen(false);
            }}
            onAddProject={addProject}
            onRefresh={refreshProjects}
            onToggleFavorite={toggleFavorite}
            onRemoveProject={removeProject}
            onRenameProject={renameProject}
          />
        )}
        <Outlet />
      </DesktopLayout>
    </DesktopProjectProvider>
  );
}

// Create router with ui-vite pages but desktop layout
const router = createBrowserRouter([
  {
    path: '/',
    element: <DesktopRootLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/specs" replace />,
      },
      {
        path: 'specs',
        element: <SpecsPage />,
      },
      {
        path: 'specs/:specName',
        element: <SpecDetailPage />,
      },
      {
        path: 'stats',
        element: <StatsPage />,
      },
      {
        path: 'dependencies',
        element: <DependenciesPage />,
      },
      {
        path: 'dependencies/:specName',
        element: <DependenciesPage />,
      },
    ],
  },
]);

const App = () => {
  return (
    <ThemeProvider>
      <KeyboardShortcutsProvider>
        <RouterProvider router={router} />
      </KeyboardShortcutsProvider>
    </ThemeProvider>
  );
};

export default App;
