import { Outlet, useLocation, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Navigation } from './Navigation';
import { MainSidebar } from './MainSidebar';
import { useGlobalShortcuts } from '../hooks/useKeyboardShortcuts';
import { ErrorBoundary } from './shared/ErrorBoundary';
import { BackToTop } from './shared/BackToTop';
import { useProject, LayoutProvider, useLayout, useKeyboardShortcuts } from '../contexts';
import { cn } from '../lib/utils';

/**
 * Layout component that wraps all project-scoped pages.
 * Provides Navigation, MainSidebar, and page transition logic.
 * Uses LayoutProvider to manage mobile sidebar state without window hacks.
 */
function LayoutContent({
  className,
  style,
  navigationRightSlot,
  onNavigationDoubleClick,
}: {
  className?: string;
  style?: React.CSSProperties;
  navigationRightSlot?: ReactNode;
  onNavigationDoubleClick?: () => void;
}) {
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, switchProject } = useProject();
  const { mobileSidebarOpen, toggleMobileSidebar } = useLayout();
  const { toggleHelp } = useKeyboardShortcuts();

  // Register global keyboard shortcuts
  useGlobalShortcuts();

  useEffect(() => {
    // Sync project context with the URL parameter
    if (!projectId || currentProject?.id === projectId) return;
    void switchProject(projectId).catch((err) =>
      console.error('Failed to sync project from route', err)
    );
  }, [currentProject?.id, projectId, switchProject]);

  return (
    <div className={cn("min-h-screen flex flex-col bg-background", className)} style={style}>
      <Navigation
        onToggleSidebar={toggleMobileSidebar}
        onShowShortcuts={toggleHelp}
        rightSlot={navigationRightSlot}
        onHeaderDoubleClick={onNavigationDoubleClick}
      />
      <div className="flex w-full min-w-0">
        <MainSidebar mobileOpen={mobileSidebarOpen} onMobileClose={toggleMobileSidebar} />
        <main className="flex-1 min-w-0 w-full lg:w-[calc(100vw-var(--main-sidebar-width,240px))] min-h-[calc(100vh-3.5rem)]">
          <ErrorBoundary resetKey={location.pathname} onReset={() => window.location.reload()}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <BackToTop />
    </div>
  );
}

/**
 * Layout wrapper that provides LayoutProvider.
 * Wraps LayoutContent to provide layout-specific state management.
 */
interface LayoutProps {
  className?: string;
  style?: React.CSSProperties;
  navigationRightSlot?: ReactNode;
  onNavigationDoubleClick?: () => void;
}

export function Layout({ className, style, navigationRightSlot, onNavigationDoubleClick }: LayoutProps) {
  return (
    <LayoutProvider>
      <LayoutContent
        className={className}
        style={style}
        navigationRightSlot={navigationRightSlot}
        onNavigationDoubleClick={onNavigationDoubleClick}
      />
    </LayoutProvider>
  );
}
