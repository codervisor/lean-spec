import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings, Palette, Cpu, Server } from 'lucide-react';
import { Button, cn } from '@leanspec/ui-components';
import { SettingsSkeleton } from '../components/shared/Skeletons';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { PageContainer } from '../components/shared/PageContainer';

export function SettingsLayout() {
  const { t } = useTranslation('common');
  const { loading: projectLoading } = useCurrentProject();
  const location = useLocation();

  if (projectLoading) {
    return <SettingsSkeleton />;
  }

  const tabs = [
    { id: 'ai', path: '/settings/ai', label: t('settings.tabs.ai'), icon: Cpu },
    { id: 'runners', path: '/settings/runners', label: t('settings.tabs.runners'), icon: Server },
    { id: 'appearance', path: '/settings/appearance', label: t('settings.tabs.appearance'), icon: Palette },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-background">
      <div className="border-b flex-none">
        <PageContainer contentClassName="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('settings.description')}</p>
          </div>
        </PageContainer>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r bg-muted/10 p-4 overflow-y-auto hidden md:block">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <NavLink key={tab.id} to={tab.path}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start",
                    isActive(tab.path) ? "bg-accent text-accent-foreground" : ""
                  )}
                >
                  <tab.icon className="mr-2 h-4 w-4" />
                  {tab.label}
                </Button>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Mobile Tab Selector (visible only on small screens) */}
        <div className="md:hidden border-b">
          <PageContainer contentClassName="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <NavLink key={tab.id} to={tab.path}>
                <Button
                  variant={isActive(tab.path) ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  <tab.icon className="mr-2 h-4 w-4" />
                  {tab.label}
                </Button>
              </NavLink>
            ))}
          </PageContainer>
        </div>

        <main className="flex-1 overflow-y-auto">
          <PageContainer contentClassName="space-y-6">
            <Outlet />
          </PageContainer>
        </main>
      </div>
    </div>
  );
}
