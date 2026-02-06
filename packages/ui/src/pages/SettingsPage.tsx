import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Palette, Cpu, Server } from 'lucide-react';
import { Button, cn } from '@/library';
import { ModelsSettingsTab } from '../components/settings/models-settings-tab';
import { AppearanceSettingsTab } from '../components/settings/appearance-settings-tab';
import { RunnerSettingsTab } from '../components/settings/runner-settings-tab';
import { SettingsSkeleton } from '../components/shared/skeletons';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { PageContainer } from '../components/shared/page-container';

export function SettingsPage() {
  const { t } = useTranslation('common');
  const { loading: projectLoading } = useCurrentProject();
  const [activeTab, setActiveTab] = useState<'models' | 'appearance' | 'runners'>('models');

  if (projectLoading) {
    return <SettingsSkeleton />;
  }

  const tabs = [
    { id: 'models', label: t('settings.tabs.models'), icon: Cpu },
    { id: 'runners', label: t('settings.tabs.runners'), icon: Server },
    { id: 'appearance', label: t('settings.tabs.appearance'), icon: Palette },
  ] as const;

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
              <Button
                key={tab.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start",
                  activeTab === tab.id ? "bg-accent text-accent-foreground" : ""
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon className="mr-2 h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </nav>
        </aside>

        {/* Mobile Tab Selector (visible only on small screens) */}
        <div className="md:hidden border-b">
          <PageContainer contentClassName="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className="whitespace-nowrap"
              >
                <tab.icon className="mr-2 h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </PageContainer>
        </div>

        <main className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'models' ? (
            <PageContainer className="h-full" contentClassName="h-full overflow-hidden">
              <ModelsSettingsTab />
            </PageContainer>
          ) : (
            <div className="h-full overflow-y-auto">
              <PageContainer contentClassName="space-y-6">
                {activeTab === 'runners' && <RunnerSettingsTab />}
                {activeTab === 'appearance' && <AppearanceSettingsTab />}
              </PageContainer>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
