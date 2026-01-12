import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { ErrorBoundary } from './shared/ErrorBoundary';
import { PageTransition } from './shared/PageTransition';
import { BackToTop } from './shared/BackToTop';
import { useGlobalShortcuts } from '../hooks/useKeyboardShortcuts';
import { LayoutProvider, useLayout, useKeyboardShortcuts } from '../contexts';
import type { ReactNode } from 'react';

/**
 * MinimalLayout provides only Navigation (app shell) without MainSidebar.
 * Used for pages like ProjectsPage where sidebar navigation doesn't make sense.
 */
function MinimalLayoutContent({ navigationRightSlot }: { navigationRightSlot?: ReactNode }) {
  const { toggleMobileSidebar } = useLayout();
  const { toggleHelp } = useKeyboardShortcuts();

  // Register global keyboard shortcuts
  useGlobalShortcuts();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation
        onToggleSidebar={toggleMobileSidebar}
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
  return (
    <LayoutProvider>
      <MinimalLayoutContent navigationRightSlot={navigationRightSlot} />
    </LayoutProvider>
  );
}
