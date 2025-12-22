import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { SpecsPage } from './pages/SpecsPage';
import { SpecDetailPage } from './pages/SpecDetailPage';
import { StatsPage } from './pages/StatsPage';
import { DependenciesPage } from './pages/DependenciesPage';
import { SettingsPage } from './pages/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'specs', element: <SpecsPage /> },
      { path: 'specs/:specName', element: <SpecDetailPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'dependencies', element: <DependenciesPage /> },
      { path: 'dependencies/:specName', element: <DependenciesPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
