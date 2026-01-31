import type { RouteObject } from 'react-router-dom';

import { SpecDetailLayout } from '../components/SpecDetailLayout';
import { ContextPage } from '../pages/ContextPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DependenciesPage } from '../pages/DependenciesPage';
// TODO: AI Chat temporarily disabled - not ready yet
// import { ChatPage } from '../pages/ChatPage';
// import { ChatSettingsPage } from '../pages/ChatSettingsPage';
// TODO: AI Sessions temporarily disabled - not ready yet
// import { SessionDetailPage } from '../pages/SessionDetailPage';
// import { SessionsPage } from '../pages/SessionsPage';
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
    // TODO: AI Sessions temporarily disabled - not ready yet
    // {
    //   path: 'sessions',
    //   children: [
    //     { index: true, element: <SessionsPage /> },
    //     { path: ':sessionId', element: <SessionDetailPage /> },
    //   ],
    // },
    { path: 'stats', element: <StatsPage /> },
    { path: 'dependencies', element: <DependenciesPage /> },
    { path: 'dependencies/:specName', element: <DependenciesPage /> },
    { path: 'context', element: <ContextPage /> },
    // TODO: AI Chat temporarily disabled - not ready yet
    // { path: 'chat', element: <ChatPage /> },
    // { path: 'chat/settings', element: <ChatSettingsPage /> },
  ];
}
