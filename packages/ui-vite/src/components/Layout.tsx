import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Navigation } from './Navigation';
import { MainSidebar } from './MainSidebar';
import { useGlobalShortcuts } from '../hooks/useKeyboardShortcuts';
import { ErrorBoundary } from './shared/ErrorBoundary';
import { PageTransition } from './shared/PageTransition';
import { BackToTop } from './shared/BackToTop';
import { useProject, LayoutProvider, useLayout, useKeyboardShortcuts } from '../contexts';

/**
 * Layout component that wraps all project-scoped pages.
 * Provides Navigation, MainSidebar, and page transition logic.
 * Uses LayoutProvider to manage mobile sidebar state without window hacks.
 */
function LayoutContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, switchProject } = useProject();
  const { mobileSidebarOpen, toggleMobileSidebar } = useLayout();
  const { toggleHelp } = useKeyboardShortcuts();

  // Register global keyboard shortcuts
  useGlobalShortcuts();

  useEffect(() => {
    // `/projects/default` is a route alias for the most recently used project.
    // Once we know the current project, normalize the URL to the real id.
    if (projectId === 'default' && currentProject?.id) {
      navigate(`/projects/${currentProject.id}`, { replace: true });
      return;
    }

    if (!projectId || projectId === 'default' || currentProject?.id === projectId) return;
    void switchProject(projectId).catch((err) =>
      console.error('Failed to sync project from route', err)
    );
  }, [currentProject?.id, navigate, projectId, switchProject]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation onToggleSidebar={toggleMobileSidebar} onShowShortcuts={toggleHelp} />
      <div className="flex w-full min-w-0">
        <MainSidebar mobileOpen={mobileSidebarOpen} onMobileClose={toggleMobileSidebar} />
        <main className="flex-1 min-w-0 w-full lg:w-[calc(100vw-var(--main-sidebar-width,240px))] min-h-[calc(100vh-3.5rem)]">
          <ErrorBoundary key={location.pathname} onReset={() => window.location.reload()}>
            <PageTransition>
              <Outlet />
            </PageTransition>
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
export function Layout() {
  return (
    <LayoutProvider>
      <LayoutContent />
    </LayoutProvider>
  );
}
