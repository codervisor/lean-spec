import { Outlet } from 'react-router-dom';
import { Navigation } from './navigation';
import { ErrorBoundary } from './shared/error-boundary';
import { PageTransition } from './shared/page-transition';
import { BackToTop } from './shared/back-to-top';
import { useGlobalShortcuts } from '../hooks/useKeyboardShortcuts';
import { useKeyboardShortcuts } from '../contexts';
import { useLayoutStore } from '../stores/layout';
import type { ReactNode } from 'react';

/**
 * MinimalLayout provides only Navigation (app shell) without MainSidebar.
 * Used for pages like ProjectsPage where sidebar navigation doesn't make sense.
 */
function MinimalLayoutContent({ navigationRightSlot }: { navigationRightSlot?: ReactNode }) {
  const { toggleSidebar } = useLayoutStore();
  const { toggleHelp } = useKeyboardShortcuts();

  // Register global keyboard shortcuts
  useGlobalShortcuts();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation
        onToggleSidebar={toggleSidebar}
        onShowShortcuts={toggleHelp}
        rightSlot={navigationRightSlot}
      />
      <main className="flex-1 w-full min-h-[calc(100vh-3.5rem)]">
        <ErrorBoundary onReset={() => window.location.reload()}>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </ErrorBoundary>
      </main>
      <BackToTop />
    </div>
  );
}

/**
 * MinimalLayout wrapper that provides LayoutProvider.
 * Note: mobileSidebarOpen state exists but has no effect since there's no sidebar.
 * This maintains API consistency with Layout component.
 */
export function MinimalLayout({ navigationRightSlot }: { navigationRightSlot?: ReactNode } = {}) {
  return <MinimalLayoutContent navigationRightSlot={navigationRightSlot} />;
}
