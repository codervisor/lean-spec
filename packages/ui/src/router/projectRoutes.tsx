import type { RouteObject } from 'react-router-dom';

import { SpecDetailLayout } from '../components/spec-detail-layout';
import { ContextPage } from '../pages/ContextPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DependenciesPage } from '../pages/DependenciesPage';
import { ChatSettingsPage } from '../pages/ChatSettingsPage';
import { FilesPage } from '../pages/FilesPage';
import { SessionDetailPage } from '../pages/SessionDetailPage';
import { SessionsPage } from '../pages/SessionsPage';
import { SpecDetailPage } from '../pages/SpecDetailPage';
import { SpecsPage } from '../pages/SpecsPage';
import { StatsPage } from '../pages/StatsPage';

/**
 * Shared project-scoped route definitions.
 *
 * Both the web app (@leanspec/ui) and desktop app (@leanspec/desktop)
 * compose these under their own top-level layouts and router types
 * (browser vs hash).
 */
export function createProjectRoutes(): RouteObject[] {
  return [
    { index: true, element: <DashboardPage /> },
    {
      path: 'specs',
      children: [
        { index: true, element: <SpecsPage /> },
        {
          element: <SpecDetailLayout />,
          children: [{ path: ':specName', element: <SpecDetailPage /> }],
        },
      ],
    },
    {
      path: 'sessions',
      children: [
        { index: true, element: <SessionsPage /> },
        { path: ':sessionId', element: <SessionDetailPage /> },
      ],
    },
    { path: 'stats', element: <StatsPage /> },
    { path: 'dependencies', element: <DependenciesPage /> },
    { path: 'dependencies/:specName', element: <DependenciesPage /> },
    { path: 'context', element: <ContextPage /> },
    { path: 'files', element: <FilesPage /> },
    { path: 'chat/settings', element: <ChatSettingsPage /> },
  ];
}
