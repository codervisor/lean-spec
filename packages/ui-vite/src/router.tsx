import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SpecsLayout } from './components/SpecsLayout';
import { DashboardPage } from './pages/DashboardPage';
import { SpecsPage } from './pages/SpecsPage';
import { SpecDetailPage } from './pages/SpecDetailPage';
import { StatsPage } from './pages/StatsPage';
import { DependenciesPage } from './pages/DependenciesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ContextPage } from './pages/ContextPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'specs',
        children: [
          { index: true, element: <SpecsPage /> },
          {
            path: ':specName',
            element: <SpecsLayout />,
            children: [
              { index: true, element: <SpecDetailPage /> },
            ],
          },
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
