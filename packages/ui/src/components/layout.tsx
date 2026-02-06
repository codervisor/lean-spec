import { Outlet, useLocation, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Navigation } from './navigation';
import { MainSidebar } from './main-sidebar';
import { MachineSwitcher } from './machine-switcher';
import { ChatSidebar } from './chat/chat-sidebar';
import { SessionsDrawer } from './sessions/sessions-drawer';
import { useGlobalShortcuts } from '../hooks/useKeyboardShortcuts';
import { ErrorBoundary } from './shared/error-boundary';
import { BackToTop } from './shared/back-to-top';
import { useKeyboardShortcuts } from '../contexts';
import { useCurrentProject, useProjectMutations } from '../hooks/useProjectQuery';
import { useLayoutStore } from '../stores/layout';
import { useMachineStore } from '../stores/machine';
import { cn } from '@leanspec/ui-components';

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
  const { currentProject } = useCurrentProject();
  const { switchProject } = useProjectMutations();
  const { isSidebarOpen, toggleSidebar } = useLayoutStore();
  const { toggleHelp } = useKeyboardShortcuts();
  const { machineModeEnabled } = useMachineStore();

  const resolvedRightSlot = navigationRightSlot ?? (machineModeEnabled ? <MachineSwitcher /> : undefined);

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
        onToggleSidebar={toggleSidebar}
        onShowShortcuts={toggleHelp}
        rightSlot={resolvedRightSlot}
        onHeaderDoubleClick={onNavigationDoubleClick}
      />
      <div className="flex w-full min-w-0">
        <MainSidebar mobileOpen={isSidebarOpen} onMobileClose={toggleSidebar} />
        <div className="flex-1 min-w-0 overflow-x-auto">
          <main
            className={cn(
              "w-full min-h-[calc(100vh-3.5rem)] lg:min-w-4xl transition-all duration-300 ease-in-out"
            )}
          >
            <ErrorBoundary resetKey={location.pathname} onReset={() => window.location.reload()}>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
        <ChatSidebar />
      </div>
      <BackToTop />
      <SessionsDrawer />
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
    <LayoutContent
      className={className}
      style={style}
      navigationRightSlot={navigationRightSlot}
      onNavigationDoubleClick={onNavigationDoubleClick}
    />
  );
}
