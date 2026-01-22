import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Palette, Cpu } from 'lucide-react';
import { Button, cn } from '@leanspec/ui-components';
import { AISettingsTab } from '../components/settings/AISettingsTab';
import { AppearanceSettingsTab } from '../components/settings/AppearanceSettingsTab';

export function SettingsPage() {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState<'ai' | 'appearance'>('ai');

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('settings.description')}</p>
          </div>
        </div>

        {/* Settings Tabs */}
        <div className="space-y-6">
          <div className="flex gap-2 border-b">
            <Button
              variant={activeTab === 'ai' ? 'default' : 'ghost'}
              className={cn(
                "rounded-b-none border-b-2",
                activeTab === 'ai' ? "border-primary" : "border-transparent"
              )}
              onClick={() => setActiveTab('ai')}
            >
              <Cpu className="h-4 w-4 mr-2" />
              {t('settings.tabs.ai')}
            </Button>
            <Button
              variant={activeTab === 'appearance' ? 'default' : 'ghost'}
              className={cn(
                "rounded-b-none border-b-2",
                activeTab === 'appearance' ? "border-primary" : "border-transparent"
              )}
              onClick={() => setActiveTab('appearance')}
            >
              <Palette className="h-4 w-4 mr-2" />
              {t('settings.tabs.appearance')}
            </Button>
          </div>

          <div className="mt-6">
            {activeTab === 'ai' && <AISettingsTab />}
            {activeTab === 'appearance' && <AppearanceSettingsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
