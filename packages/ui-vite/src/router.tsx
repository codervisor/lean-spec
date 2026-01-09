import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { MinimalLayout } from './components/MinimalLayout';
import { ProjectsPage } from './pages/ProjectsPage';
import { RootRedirect } from './components/RootRedirect';
import { createProjectRoutes } from './router/projectRoutes';

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
 * 3. SpecDetailLayout provides SpecsNavSidebar + outlet context
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/projects',
    element: <MinimalLayout />,
    children: [{ index: true, element: <ProjectsPage /> }],
  },
  {
    path: '/projects/:projectId',
    element: <Layout />,
    children: createProjectRoutes(),
  },
]);
