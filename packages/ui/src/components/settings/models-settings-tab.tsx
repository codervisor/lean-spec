import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/library';
import { Plus, RefreshCw, AlertCircle } from 'lucide-react';
import type { Provider } from '../../types/chat-config';
import type { RegistryProvider } from '../../types/models-registry';
import { SearchFilterBar } from '../shared/search-filter-bar';
import { useToast } from '../../contexts';
import { useModelsRegistry } from '../../lib/use-models-registry';
import { useAIFiltersStore } from '../../stores/settings-filters';
import { useChatConfig, useChatConfigMutations } from '../../hooks/useChatConfigQuery';
import { useModelsRegistryMutations } from '../../hooks/useModelsQuery';

import { RegistryProviderCard } from './models-settings/registry-provider-card';
import { CustomProviderCard } from './models-settings/custom-provider-card';
import { ProviderApiKeyDialog } from './models-settings/provider-api-key-dialog';
import { ProviderModelsDialog } from './models-settings/provider-models-dialog';
import { CustomProviderDialog } from './models-settings/custom-provider-dialog';

function isRegistryProvider(p: RegistryProvider | Provider): p is RegistryProvider {
  return 'isConfigured' in p;
}

export function ModelsSettingsTab() {
  const { t } = useTranslation('common');
  const { toast } = useToast();

  const { allProviders: registryProviders, loading: registryLoading, error: registryError, reload: reloadRegistry } = useModelsRegistry();
  const { data: config, isLoading: configLoading } = useChatConfig();
  const { updateConfig, updateDefaults } = useChatConfigMutations();
  const { refreshRegistry, setApiKey, isRefreshing } = useModelsRegistryMutations();

  const [showApiKeyDialog, setShowApiKeyDialog] = useState<string | null>(null);
  const [showModelsDialog, setShowModelsDialog] = useState<string | null>(null);
  const [showCustomProviderDialog, setShowCustomProviderDialog] = useState(false);
  const [editingCustomProvider, setEditingCustomProvider] = useState<Provider | null>(null);

  const { searchQuery, sortBy, statusFilter, setSearchQuery, setSortBy, setStatusFilter } = useAIFiltersStore();

  const customProviders = useMemo(() => {
    if (!config) return [];
    const registryIds = new Set(registryProviders.map((p) => p.id));
    return config.providers.filter((p) => !registryIds.has(p.id));
  }, [config, registryProviders]);

  const handleRefreshRegistry = async () => {
    try { await refreshRegistry(); reloadRegistry(); } catch { /* ignore */ }
  };

  const handleSetApiKey = async (providerId: string, apiKey: string, baseUrl?: string) => {
    await setApiKey({ providerId, apiKey, baseUrl });
    reloadRegistry();
  };

  const handleUpdateDefaults = async (field: 'maxSteps' | 'defaultProviderId' | 'defaultModelId', value: string | number) => {
    if (!config) return;
    await updateDefaults({ config, field, value });
  };

  const handleSaveEnabledModels = async (providerId: string, enabledModels: string[] | undefined) => {
    if (!config) return;
    const newSettings = { ...config.settings };
    if (!newSettings.enabledModels) newSettings.enabledModels = {};
    if (enabledModels === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [providerId]: _removed, ...rest } = newSettings.enabledModels;
      newSettings.enabledModels = rest;
    } else {
      newSettings.enabledModels = { ...newSettings.enabledModels, [providerId]: enabledModels };
    }
    await updateConfig({ ...config, settings: newSettings });
    reloadRegistry();
  };

  const allProviders = useMemo(() => {
    const combined: Array<{ id: string; name: string; hasKey: boolean; models: Array<{ id: string; name: string }> }> = [];
    for (const p of registryProviders) combined.push({ id: p.id, name: p.name, hasKey: p.isConfigured, models: p.models.map((m) => ({ id: m.id, name: m.name })) });
    for (const p of customProviders) combined.push({ id: p.id, name: p.name, hasKey: p.hasApiKey, models: p.models.map((m) => ({ id: m.id, name: m.name })) });
    return combined;
  }, [registryProviders, customProviders]);

  const handleSetDefaultProvider = async (providerId: string) => {
    await handleUpdateDefaults('defaultProviderId', providerId);
    const providerName = allProviders.find((p) => p.id === providerId)?.name ?? providerId;
    toast({ title: t('settings.ai.toasts.defaultProvider', { provider: providerName }), variant: 'success' });
  };

  const handleSaveCustomProvider = async (provider: Provider) => {
    if (!config) return;
    const existingIndex = config.providers.findIndex((p) => p.id === provider.id);
    const newProviders = [...config.providers];
    if (existingIndex >= 0) newProviders[existingIndex] = provider; else newProviders.push(provider);
    await updateConfig({ ...config, providers: newProviders });
  };

  const handleDeleteCustomProvider = async (providerId: string) => {
    if (!config) return;
    if (!confirm(t('settings.ai.confirmDeleteProvider'))) return;
    const newConfig = { ...config, providers: config.providers.filter((p) => p.id !== providerId) };
    if (config.settings.defaultProviderId === providerId) {
      newConfig.settings.defaultProviderId = newConfig.providers[0]?.id ?? registryProviders[0]?.id ?? '';
      newConfig.settings.defaultModelId = '';
    }
    await updateConfig(newConfig);
  };

  const filteredProviders = useMemo(() => {
    const match = (p: RegistryProvider | Provider) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q) && !p.models.some(m => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q))) return false;
      }
      const isConfigured = 'isConfigured' in p ? p.isConfigured : (p as Provider).hasApiKey;
      if (statusFilter === 'configured' && !isConfigured) return false;
      if (statusFilter === 'unconfigured' && isConfigured) return false;
      return true;
    };
    const sorter = (a: RegistryProvider | Provider, b: RegistryProvider | Provider) => {
      if (sortBy === 'models') return b.models.length - a.models.length;
      if (sortBy === 'configured') {
        const ca = 'isConfigured' in a ? a.isConfigured : (a as Provider).hasApiKey;
        const cb = 'isConfigured' in b ? b.isConfigured : (b as Provider).hasApiKey;
        if (ca !== cb) return cb ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    };
    return [...registryProviders, ...customProviders].filter(match).sort(sorter);
  }, [registryProviders, customProviders, searchQuery, sortBy, statusFilter]);

  const loading = registryLoading || configLoading;

  if (loading) return <div className="flex items-center justify-center p-12"><div className="animate-pulse text-muted-foreground">{t('actions.loading')}</div></div>;
  if (registryError) return (
    <div className="p-6 border rounded-lg">
      <div className="flex items-center gap-2 text-destructive"><AlertCircle className="h-5 w-5" /><p>{registryError}</p></div>
      <Button onClick={reloadRegistry} className="mt-4">{t('actions.retry')}</Button>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] overflow-hidden">
      <div className="flex-none space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">{t('settings.ai.providers')}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{t('settings.ai.providersDescription')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefreshRegistry} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />{t('settings.ai.refreshRegistry')}
            </Button>
            <Button size="sm" onClick={() => { setEditingCustomProvider(null); setShowCustomProviderDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />{t('settings.ai.addCustomProvider')}
            </Button>
          </div>
        </div>
        <SearchFilterBar
          searchQuery={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder={t('settings.ai.searchPlaceholder')}
          sortBy={sortBy} onSortChange={setSortBy}
          sortOptions={[{ value: 'name', label: t('settings.ai.sort.name') }, { value: 'models', label: t('settings.ai.sort.models') }, { value: 'configured', label: t('settings.ai.sort.configured') }]}
          filters={[{ label: t('settings.ai.filters.status'), type: 'radio' as const, options: [], value: statusFilter, onValueChange: (v: string) => setStatusFilter(v as 'all' | 'configured' | 'unconfigured'), radioOptions: [{ value: 'all', label: t('settings.ai.filters.all') }, { value: 'configured', label: t('settings.ai.filters.configured') }, { value: 'unconfigured', label: t('settings.ai.filters.unconfigured') }] }]}
          resultCount={filteredProviders.length} totalCount={registryProviders.length + customProviders.length} filteredCountKey="settings.ai.filteredCount"
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-2">
        {filteredProviders.map((provider) => isRegistryProvider(provider) ? (
          <RegistryProviderCard key={provider.id} provider={provider} isDefault={config?.settings.defaultProviderId === provider.id} enabledModels={config?.settings.enabledModels?.[provider.id]}
            onSetDefault={() => handleSetDefaultProvider(provider.id)} onConfigureKey={() => setShowApiKeyDialog(provider.id)} onConfigureModels={() => setShowModelsDialog(provider.id)} />
        ) : (
          <CustomProviderCard key={provider.id} provider={provider} isDefault={config?.settings.defaultProviderId === provider.id}
            onSetDefault={() => handleSetDefaultProvider(provider.id)} onEdit={() => { setEditingCustomProvider(provider); setShowCustomProviderDialog(true); }} onDelete={() => handleDeleteCustomProvider(provider.id)} />
        ))}
      </div>

      {showApiKeyDialog && (
        <ProviderApiKeyDialog provider={registryProviders.find((p) => p.id === showApiKeyDialog)!}
          onSave={async (apiKey, baseUrl) => { await handleSetApiKey(showApiKeyDialog, apiKey, baseUrl); toast({ title: apiKey ? t('settings.ai.toasts.apiKeySaved') : t('settings.ai.toasts.apiKeyCleared'), variant: 'success' }); setShowApiKeyDialog(null); }}
          onCancel={() => setShowApiKeyDialog(null)} />
      )}
      {showModelsDialog && (
        <ProviderModelsDialog provider={registryProviders.find((p) => p.id === showModelsDialog)!} initialEnabledModels={config?.settings.enabledModels?.[showModelsDialog]}
          onSave={async (models) => { await handleSaveEnabledModels(showModelsDialog, models); toast({ title: t('settings.ai.toasts.modelsSaved'), variant: 'success' }); setShowModelsDialog(null); }}
          onCancel={() => setShowModelsDialog(null)} />
      )}
      {showCustomProviderDialog && (
        <CustomProviderDialog provider={editingCustomProvider} existingIds={[...registryProviders.map((p) => p.id), ...customProviders.map((p) => p.id)]}
          onSave={async (provider) => { await handleSaveCustomProvider(provider); setShowCustomProviderDialog(false); setEditingCustomProvider(null); }}
          onCancel={() => { setShowCustomProviderDialog(false); setEditingCustomProvider(null); }} />
      )}
    </div>
  );
}
