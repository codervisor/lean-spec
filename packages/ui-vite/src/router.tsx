import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { MinimalLayout } from './components/MinimalLayout';
import { DashboardPage } from './pages/DashboardPage';
import { SpecsPage } from './pages/SpecsPage';
import { SpecDetailPage } from './pages/SpecDetailPage';
import { StatsPage } from './pages/StatsPage';
import { DependenciesPage } from './pages/DependenciesPage';
import { ContextPage } from './pages/ContextPage';
import { ProjectsPage } from './pages/ProjectsPage';

/**
 * Router configuration for ui-vite.
 *
 * Layout hierarchy:
 * - MinimalLayout: Navigation only (for ProjectsPage)
 * - Layout: Navigation + MainSidebar (for project-scoped routes)
 *
 * This nested layout approach ensures:
 * 1. Navigation bar is always present across all pages
 * 2. MainSidebar only shows when viewing a specific project
 * 3. SpecDetailPage handles its own SpecsNavSidebar internally
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/projects/default" replace />,
  },
  {
    path: '/projects',
    element: <MinimalLayout />,
    children: [{ index: true, element: <ProjectsPage /> }],
  },
  {
    path: '/projects/:projectId',
    element: <Layout />,
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
