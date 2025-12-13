/**
 * React Router configuration for desktop SPA
 * 
 * This replaces the Next.js file-based routing with React Router
 * for the native Tauri desktop app (Phase 4 of spec 169).
 */

import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom';
import DesktopLayout from './components/DesktopLayout';
import TitleBar from './components/TitleBar';
import { SpecsPage } from './pages/SpecsPage';
import { SpecDetailPage } from './pages/SpecDetailPage';
import { StatsPage } from './pages/StatsPage';
import { DependenciesPage } from './pages/DependenciesPage';
import { useProjects } from './hooks/useProjects';
import styles from './app.module.css';

/**
 * Root layout that provides the desktop shell and project context
 */
function RootLayout() {
  const {
    projects,
    activeProjectId,
    loading,
    error,
    switchProject,
    addProject,
    refreshProjects,
  } = useProjects();

  if (loading) {
    return (
      <DesktopLayout header={<TitleBar projects={[]} activeProjectId={undefined} onProjectSelect={() => {}} onAddProject={() => {}} onRefresh={() => {}} onManageProjects={() => {}} isLoading={true} />}>
        <div className={styles.centerState}>Loading desktop environment…</div>
      </DesktopLayout>
    );
  }

  if (error) {
    return (
      <DesktopLayout header={<TitleBar projects={[]} activeProjectId={undefined} onProjectSelect={() => {}} onAddProject={() => {}} onRefresh={() => {}} onManageProjects={() => {}} isLoading={false} />}>
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
            onManageProjects={() => {}}
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
    <DesktopLayout 
      header={
        <TitleBar 
          projects={projects} 
          activeProjectId={activeProjectId} 
          onProjectSelect={switchProject} 
          onAddProject={addProject} 
          onRefresh={refreshProjects} 
          onManageProjects={() => {}}
          isLoading={false}
        />
      }
    >
      <Outlet context={{ projectId: activeProjectId, projects, refreshProjects }} />
    </DesktopLayout>
  );
}

/**
 * Router configuration
 * 
 * Routes mirror the Next.js structure but use React Router:
 * - /specs → Spec list page
 * - /specs/:specId → Spec detail page  
 * - /stats → Statistics page
 * - /dependencies → Dependencies graph page
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
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
        path: 'specs/:specId',
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
    ],
  },
]);

/**
 * App Router component
 * 
 * This is the entry point for the SPA routing.
 * Use this instead of the iframe-based App component for native mode.
 */
export function AppRouter() {
  return <RouterProvider router={router} />;
}

export default AppRouter;
