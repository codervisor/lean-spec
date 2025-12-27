import { Outlet, useLocation, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Navigation } from './Navigation';
import { MainSidebar } from './MainSidebar';
import { useGlobalShortcuts } from '../hooks/useKeyboardShortcuts';
import { ErrorBoundary } from './shared/ErrorBoundary';
import { PageTransition } from './shared/PageTransition';
import { BackToTop } from './shared/BackToTop';
import { Button } from '@leanspec/ui-components';
import { useProject } from '../contexts';
import { useTranslation } from 'react-i18next';

function KeyboardShortcutsHelp({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('common');
  const shortcuts = [
    { key: 'h', description: t('keyboardShortcuts.items.dashboard') },
    { key: 'g', description: t('keyboardShortcuts.items.specs') },
    { key: 's', description: t('keyboardShortcuts.items.stats') },
    { key: 'd', description: t('keyboardShortcuts.items.dependencies') },
    { key: ',', description: t('keyboardShortcuts.items.settings') },
    { key: '/', description: t('keyboardShortcuts.items.search') },
    { key: '⌘ + K', description: t('keyboardShortcuts.items.quickSearch') },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-background border rounded-lg shadow-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-medium mb-4">{t('keyboardShortcuts.title')}</h3>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.description}</span>
              <kbd className="px-2 py-1 text-xs bg-secondary rounded border">{s.key}</kbd>
            </div>
          ))}
        </div>
        <Button
          onClick={onClose}
          variant="secondary"
          size="sm"
          className="mt-4 w-full"
        >
          {t('actions.close')}
        </Button>
      </div>
    </div>
  );
}

export function Layout() {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, switchProject } = useProject();

  // Register global keyboard shortcuts
  useGlobalShortcuts();

  // Expose toggle function to window for Navigation component
  useEffect(() => {
    (window as any).toggleMainSidebar = () => {
      setMobileSidebarOpen(prev => !prev);
    };

    return () => {
      delete (window as any).toggleMainSidebar;
    };
  }, []);

  useEffect(() => {
    if (!projectId || currentProject?.id === projectId) return;
    void switchProject(projectId).catch((err) => console.error('Failed to sync project from route', err));
  }, [currentProject?.id, projectId, switchProject]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation onShowShortcuts={() => setShowShortcuts(true)} />
      <div className="flex w-full min-w-0">
        <MainSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <main className="flex-1 min-w-0 w-full lg:w-[calc(100vw-var(--main-sidebar-width,240px))] min-h-[calc(100vh-3.5rem)]">
          <ErrorBoundary key={location.pathname} onReset={() => window.location.reload()}>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </ErrorBoundary>
        </main>
      </div>
      {showShortcuts && <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />}
      <BackToTop />
    </div>
  );
}
