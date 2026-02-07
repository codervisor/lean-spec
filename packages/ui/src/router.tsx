import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProjectsPage } from './pages/ProjectsPage';
import { MachinesPage } from './pages/MachinesPage';
import { SettingsLayout } from './layouts/SettingsLayout';
import { AISettingsPage } from './pages/settings/AISettingsPage';
import { RunnersSettingsPage } from './pages/settings/RunnersSettingsPage';
import { AppearanceSettingsPage } from './pages/settings/AppearanceSettingsPage';
import { RootRedirect } from './components/RootRedirect';
import { createProjectRoutes } from './router/projectRoutes';

/**
 * Router configuration for @leanspec/ui (Vite SPA).
 *
 * Layout hierarchy:
 * - Layout: Navigation + MainSidebar (for all project routes including projects list)
 *
 * This nested layout approach ensures:
 * 1. Navigation bar is always present across all pages
 * 2. MainSidebar is always visible for consistent navigation
 * 3. SpecDetailLayout provides SpecsNavSidebar + outlet context
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/projects',
    element: <Layout />,
    children: [{ index: true, element: <ProjectsPage /> }],
  },
  {
    path: '/machines',
    element: <Layout />,
    children: [{ index: true, element: <MachinesPage /> }],
  },
  {
    path: '/settings',
    element: <Layout />,
    children: [
      {
        element: <SettingsLayout />,
        children: [
          { index: true, element: <Navigate to="/settings/ai" replace /> },
          { path: 'ai', element: <AISettingsPage /> },
          { path: 'runners', element: <RunnersSettingsPage /> },
          { path: 'appearance', element: <AppearanceSettingsPage /> },
        ],
      },
    ],
  },
  {
    path: '/projects/:projectId',
    element: <Layout />,
    children: createProjectRoutes(),
  },
]);
