import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SpecsLayout } from './components/SpecsLayout';
import { DashboardPage } from './pages/DashboardPage';
import { SpecsPage } from './pages/SpecsPage';
import { SpecDetailPage } from './pages/SpecDetailPage';
import { StatsPage } from './pages/StatsPage';
import { DependenciesPage } from './pages/DependenciesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ContextPage } from './pages/ContextPage';
import { ProjectsPage } from './pages/ProjectsPage';

/**
 * Router configuration for ui-vite.
 *
 * Layout composition:
 * - Layout: Navigation + MainSidebar (applies to all /projects/:projectId/* routes)
 * - SpecsLayout: SpecsNavSidebar (applies to all /projects/:projectId/specs/* routes)
 *
 * This nested layout approach ensures consistent UI structure while allowing
 * specs-specific navigation to be scoped to specs routes only.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/projects/default" replace />,
  },
  {
    path: '/projects',
    element: <ProjectsPage />,
  },
  {
    path: '/projects/:projectId',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      {
        // Specs routes now all use SpecsLayout (both list and detail)
        path: 'specs',
        element: <SpecsLayout />,
        children: [
          { index: true, element: <SpecsPage /> },
          { path: ':specName', element: <SpecDetailPage /> },
        ],
      },
      { path: 'stats', element: <StatsPage /> },
      { path: 'dependencies', element: <DependenciesPage /> },
      { path: 'dependencies/:specName', element: <DependenciesPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'context', element: <ContextPage /> },
    ],
  },
]);
