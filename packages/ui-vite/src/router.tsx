import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProjectsPage } from './pages/ProjectsPage';
import { RootRedirect } from './components/RootRedirect';
import { createProjectRoutes } from './router/projectRoutes';

/**
 * Router configuration for ui-vite.
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
    path: '/projects/:projectId',
    element: <Layout />,
    children: createProjectRoutes(),
  },
]);
