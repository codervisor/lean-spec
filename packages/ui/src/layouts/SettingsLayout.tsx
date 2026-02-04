import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings, Palette, Cpu, Server, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@leanspec/ui-components';
import { SettingsSkeleton } from '../components/shared/Skeletons';
import { SidebarLink } from '../components/shared/SidebarLink';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { useDisplayStore } from '../stores/display';

const SETTINGS_SIDEBAR_STORAGE_KEY = 'settings-sidebar-collapsed';

export function SettingsLayout() {
  const { t } = useTranslation('common');
  const { loading: projectLoading } = useCurrentProject();
  const { displayMode } = useDisplayStore();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SETTINGS_SIDEBAR_STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SETTINGS_SIDEBAR_STORAGE_KEY, String(collapsed));
    }
  }, [collapsed]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (projectLoading) {
    return <SettingsSkeleton />;
  }

  const tabs = [
    { id: 'ai', path: '/settings/ai', label: t('settings.tabs.ai'), icon: Cpu },
    { id: 'runners', path: '/settings/runners', label: t('settings.tabs.runners'), icon: Server },
    { id: 'appearance', path: '/settings/appearance', label: t('settings.tabs.appearance'), icon: Palette },
  ];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-background">
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile overlay backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <aside
          className={cn(
            'border-r bg-background transition-all duration-300 flex-shrink-0',
            // Desktop behavior - icon-only when collapsed (like MainSidebar)
            'hidden lg:flex lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]',
            collapsed ? 'lg:w-[60px]' : 'lg:w-[240px]',
            // Mobile behavior
            mobileOpen && 'fixed inset-y-0 left-0 z-50 flex w-[280px] shadow-xl'
          )}
        >
          <div className="flex flex-col h-full w-full">
            {/* Mobile close button */}
            <div className="lg:hidden flex justify-end p-2 border-b">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 hover:bg-secondary rounded-md transition-colors"
                aria-label={t('navigation.closeMenu')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
              {/* Settings Header - mimics ProjectSwitcher placement in MainSidebar */}
              <div className={cn(
                "mb-4 flex items-center h-9",
                collapsed && !mobileOpen ? "justify-center" : "px-3"
              )}>
                <div className="flex items-center gap-3 font-semibold text-sm">
                  <Settings className="h-5 w-5 text-primary shrink-0" />
                  {(!collapsed || mobileOpen) && <span className="truncate">{t('settings.title')}</span>}
                </div>
              </div>

              {tabs.map((tab) => (
                <SidebarLink
                  key={tab.id}
                  to={tab.path}
                  icon={tab.icon}
                  label={tab.label}
                  isCollapsed={collapsed && !mobileOpen}
                />
              ))}
            </nav>

            {/* Collapse/Expand toggle at bottom (desktop only) */}
            <div className="hidden lg:block p-2 border-t">
              <button
                onClick={() => setCollapsed((prev) => !prev)}
                className={cn(
                  'w-full flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary transition-colors',
                  collapsed && 'px-2'
                )}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                {!collapsed && <span className="text-xs">{t('navigation.collapse')}</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile header with menu button */}
        <div className="lg:hidden absolute top-0 left-0 right-0 z-30 bg-background border-b">
          <div className="flex items-center gap-3 p-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 hover:bg-secondary rounded-md transition-colors"
            >
              <Settings className="h-5 w-5" />
            </button>
            <span className="font-semibold text-sm">{t('settings.title')}</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto lg:pt-0 pt-14">
          <div className={cn(
            "mx-auto p-6 space-y-6 transition-[max-width] duration-300",
            displayMode === 'wide' ? 'max-w-7xl' : 'max-w-4xl'
          )}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
