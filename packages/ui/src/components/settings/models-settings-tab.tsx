import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  ModelSelectorLogo,
  Switch,
  cn,
} from '@leanspec/ui-components';
import { Plus, Trash2, CheckCircle, AlertCircle, Settings, RefreshCw, ChevronDown, Wrench, Eye, EyeOff, Zap, Brain, ImageIcon, MoreVertical, Star, ListFilter, Check, Key, ArrowUp, ArrowDown } from 'lucide-react';
import type { Provider } from '../../types/chat-config';
import type { RegistryProvider } from '../../types/models-registry';
import { SearchFilterBar } from '../shared/search-filter-bar';
import { useToast } from '../../contexts';
import { useModelsRegistry } from '../../lib/use-models-registry';
import { useAIFiltersStore } from '../../stores/settings-filters';
import { List, type RowComponentProps } from 'react-window';
import { useChatConfig, useChatConfigMutations } from '../../hooks/useChatConfigQuery';
import { useModelsRegistryMutations } from '../../hooks/useModelsQuery';

function Label({ htmlFor, children, className = '' }: { htmlFor?: string; children: React.ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>
      {children}
    </label>
  );
}

function isRegistryProvider(p: RegistryProvider | Provider): p is RegistryProvider {
  return 'isConfigured' in p;
}

export function ModelsSettingsTab() {
  const { t } = useTranslation('common');
  const { toast } = useToast();

  // Registry providers (from models.dev) - use shared hook
  // Settings page uses allProviders to show all providers for configuration
  const {
    allProviders: registryProviders,
    loading: registryLoading,
    error: registryError,
    reload: reloadRegistry,
  } = useModelsRegistry();

  // Chat config (for defaults and custom providers) - use TanStack Query
  const { data: config, isLoading: configLoading } = useChatConfig();
  const { updateConfig, updateDefaults } = useChatConfigMutations();
  const { refreshRegistry, setApiKey, isRefreshing } = useModelsRegistryMutations();

  // UI state
  const [showApiKeyDialog, setShowApiKeyDialog] = useState<string | null>(null);
  const [showModelsDialog, setShowModelsDialog] = useState<string | null>(null);
  const [showCustomProviderDialog, setShowCustomProviderDialog] = useState(false);
  const [editingCustomProvider, setEditingCustomProvider] = useState<Provider | null>(null);

  // Filter/Search State - persisted via zustand store
  const {
    searchQuery,
    sortBy,
    statusFilter,
    setSearchQuery,
    setSortBy,
    setStatusFilter,
  } = useAIFiltersStore();

  // Identify custom providers (in config but not in registry)
  const customProviders = useMemo(() => {
    if (!config) return [];
    const registryIds = new Set(registryProviders.map((p) => p.id));
    return config.providers.filter((p) => !registryIds.has(p.id));
  }, [config, registryProviders]);


  // Refresh registry from models.dev
  const handleRefreshRegistry = async () => {
    try {
      await refreshRegistry();
      reloadRegistry();
    } catch {
      // Ignore refresh errors
    }
  };

  // Set API key for a provider (with optional base URL for providers like Azure)
  const handleSetApiKey = async (providerId: string, apiKey: string, baseUrl?: string) => {
    await setApiKey({ providerId, apiKey, baseUrl });
    // Reload registry to reflect updated isConfigured status
    reloadRegistry();
  };

  const handleUpdateDefaults = async (field: 'maxSteps' | 'defaultProviderId' | 'defaultModelId', value: string | number) => {
    if (!config) return;

    await updateDefaults({ config, field, value });
  };

  const handleSaveEnabledModels = async (providerId: string, enabledModels: string[] | undefined) => {
    if (!config) return;
    const newSettings = { ...config.settings };

    // Initialize if missing
    if (!newSettings.enabledModels) {
      newSettings.enabledModels = {};
    }

    if (enabledModels === undefined) {
      // Remove restriction
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [providerId]: _removed, ...rest } = newSettings.enabledModels;
      newSettings.enabledModels = rest;
    } else {
      // Set restriction
      newSettings.enabledModels = {
        ...newSettings.enabledModels,
        [providerId]: enabledModels
      };
    }

    await updateConfig({ ...config, settings: newSettings });
    reloadRegistry();
  };

  const handleSetDefaultProvider = async (providerId: string) => {
    await handleUpdateDefaults('defaultProviderId', providerId);
    const providerName = allProviders.find((provider) => provider.id === providerId)?.name ?? providerId;
    toast({
      title: t('settings.ai.toasts.defaultProvider', { provider: providerName }),
      variant: 'success',
    });
  };

  // Custom provider handlers
  const handleSaveCustomProvider = async (provider: Provider) => {
    if (!config) return;

    const existingIndex = config.providers.findIndex((p) => p.id === provider.id);
    const newProviders = [...config.providers];

    if (existingIndex >= 0) {
      newProviders[existingIndex] = provider;
    } else {
      newProviders.push(provider);
    }

    await updateConfig({ ...config, providers: newProviders });
  };

  const handleDeleteCustomProvider = async (providerId: string) => {
    if (!config) return;
    if (!confirm(t('settings.ai.confirmDeleteProvider'))) return;

    const newConfig = {
      ...config,
      providers: config.providers.filter((p) => p.id !== providerId),
    };

    if (config.settings.defaultProviderId === providerId) {
      newConfig.settings.defaultProviderId = newConfig.providers[0]?.id ?? registryProviders[0]?.id ?? '';
      newConfig.settings.defaultModelId = '';
    }

    await updateConfig(newConfig);
  };

  // All providers for defaults dropdown
  const allProviders = useMemo(() => {
    const combined: Array<{ id: string; name: string; hasKey: boolean; models: Array<{ id: string; name: string }> }> = [];

    // Registry providers
    for (const p of registryProviders) {
      combined.push({
        id: p.id,
        name: p.name,
        hasKey: p.isConfigured,
        models: p.models.map((m) => ({ id: m.id, name: m.name })),
      });
    }

    // Custom providers
    for (const p of customProviders) {
      combined.push({
        id: p.id,
        name: p.name,
        hasKey: p.hasApiKey,
        models: p.models.map((m) => ({ id: m.id, name: m.name })),
      });
    }

    return combined;
  }, [registryProviders, customProviders]);

  // Filter Logic
  const filteredProviders = useMemo(() => {
    // Helper to check match
    const match = (p: RegistryProvider | Provider) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
        const matchModel = p.models.some(m => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
        if (!matchName && !matchModel) return false;
      }

      // Filter
      const isConfigured = 'isConfigured' in p ? p.isConfigured : (p as Provider).hasApiKey;
      if (statusFilter === 'configured' && !isConfigured) return false;
      if (statusFilter === 'unconfigured' && isConfigured) return false;

      return true;
    };

    // Helper to sort
    const sorter = (a: RegistryProvider | Provider, b: RegistryProvider | Provider) => {
      if (sortBy === 'models') {
        return b.models.length - a.models.length;
      }
      if (sortBy === 'configured') {
        const isConfiguredA = 'isConfigured' in a ? a.isConfigured : (a as Provider).hasApiKey;
        const isConfiguredB = 'isConfigured' in b ? b.isConfigured : (b as Provider).hasApiKey;
        // Configured first (true < false in this sort direction, so we return -1 if a is configured and b is not)
        if (isConfiguredA !== isConfiguredB) return isConfiguredB ? 1 : -1;
        return a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    }

    return [...registryProviders, ...customProviders].filter(match).sort(sorter);
  }, [registryProviders, customProviders, searchQuery, sortBy, statusFilter]);

  const loading = registryLoading || configLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-pulse text-muted-foreground">{t('actions.loading')}</div>
      </div>
    );
  }

  if (registryError) {
    return (
      <div className="p-6 border rounded-lg">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>{registryError}</p>
        </div>
        <Button onClick={reloadRegistry} className="mt-4">
          {t('actions.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] overflow-hidden">
      {/* Registry Providers Section */}
      <div className="flex-none space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">{t('settings.ai.providers')}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{t('settings.ai.providersDescription')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefreshRegistry} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('settings.ai.refreshRegistry')}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingCustomProvider(null);
                setShowCustomProviderDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('settings.ai.addCustomProvider')}
            </Button>
          </div>
        </div>

        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('settings.ai.searchPlaceholder')}
          sortBy={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'name', label: t('settings.ai.sort.name') },
            { value: 'models', label: t('settings.ai.sort.models') },
            { value: 'configured', label: t('settings.ai.sort.configured') },
          ]}
          filters={[
            {
              label: t('settings.ai.filters.status'),
              type: 'radio' as const,
              options: [],
              value: statusFilter,
              onValueChange: (v: string) => setStatusFilter(v as 'all' | 'configured' | 'unconfigured'),
              radioOptions: [
                { value: 'all', label: t('settings.ai.filters.all') },
                { value: 'configured', label: t('settings.ai.filters.configured') },
                { value: 'unconfigured', label: t('settings.ai.filters.unconfigured') },
              ]
            }
          ]}
          resultCount={filteredProviders.length}
          totalCount={registryProviders.length + customProviders.length}
          filteredCountKey="settings.ai.filteredCount"
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-2">
        {filteredProviders.map((provider) => {
          const isRegistry = isRegistryProvider(provider);
          if (isRegistry) {
            return (
              <RegistryProviderCard
                key={provider.id}
                provider={provider}
                isDefault={config?.settings.defaultProviderId === provider.id}
                enabledModels={config?.settings.enabledModels?.[provider.id]}
                onSetDefault={() => handleSetDefaultProvider(provider.id)}
                onConfigureKey={() => setShowApiKeyDialog(provider.id)}
                onConfigureModels={() => setShowModelsDialog(provider.id)}
              />
            );
          }
          return (
            <CustomProviderCard
              key={provider.id}
              provider={provider}
              isDefault={config?.settings.defaultProviderId === provider.id}
              onSetDefault={() => handleSetDefaultProvider(provider.id)}
              onEdit={() => {
                setEditingCustomProvider(provider);
                setShowCustomProviderDialog(true);
              }}
              onDelete={() => handleDeleteCustomProvider(provider.id)}
            />
          );
        })}
      </div>
      {/* Provider API Key Dialog */}
      {showApiKeyDialog && (
        <ProviderApiKeyDialog
          provider={registryProviders.find((p) => p.id === showApiKeyDialog)!}
          onSave={async (apiKey, baseUrl) => {
            await handleSetApiKey(showApiKeyDialog, apiKey, baseUrl);
            toast({
              title: apiKey ? t('settings.ai.toasts.apiKeySaved') : t('settings.ai.toasts.apiKeyCleared'),
              variant: 'success',
            });
            setShowApiKeyDialog(null);
          }}
          onCancel={() => setShowApiKeyDialog(null)}
        />
      )}

      {/* Provider Models Dialog */}
      {showModelsDialog && (
        <ProviderModelsDialog
          provider={registryProviders.find((p) => p.id === showModelsDialog)!}
          initialEnabledModels={config?.settings.enabledModels?.[showModelsDialog]}
          onSave={async (models) => {
            await handleSaveEnabledModels(showModelsDialog, models);
            toast({ title: t('settings.ai.toasts.modelsSaved'), variant: 'success' });
            setShowModelsDialog(null);
          }}
          onCancel={() => setShowModelsDialog(null)}
        />
      )}

      {/* Custom Provider Dialog */}
      {showCustomProviderDialog && (
        <CustomProviderDialog
          provider={editingCustomProvider}
          existingIds={[...registryProviders.map((p) => p.id), ...customProviders.map((p) => p.id)]}
          onSave={async (provider) => {
            await handleSaveCustomProvider(provider);
            setShowCustomProviderDialog(false);
            setEditingCustomProvider(null);
          }}
          onCancel={() => {
            setShowCustomProviderDialog(false);
            setEditingCustomProvider(null);
          }}
        />
      )}
    </div>
  );
}

/** Registry Provider Card - shows provider from models.dev with API key configuration */
interface RegistryProviderCardProps {
  provider: RegistryProvider;
  isDefault: boolean;
  enabledModels?: string[];
  onSetDefault: () => void;
  onConfigureKey: () => void;
  onConfigureModels: () => void;
}

interface RowData {
  models: RegistryProvider['models'];
  t: (key: string, options?: Record<string, unknown>) => string;
}

function ModelRow({ index, style, models, t }: RowComponentProps<RowData>) {
  const model = models[index];
  return (
    <div style={style} className="flex items-center gap-2 text-xs">
      <span className="font-mono text-muted-foreground truncate flex-1">{model.id}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {model.toolCall && (
          <span title={t('settings.ai.capabilities.toolCall')} className="text-blue-500">
            <Zap className="h-3 w-3" />
          </span>
        )}
        {model.reasoning && (
          <span title={t('settings.ai.capabilities.reasoning')} className="text-purple-500">
            <Brain className="h-3 w-3" />
          </span>
        )}
        {model.vision && (
          <span title={t('settings.ai.capabilities.vision')} className="text-green-500">
            <ImageIcon className="h-3 w-3" />
          </span>
        )}
        {model.contextWindow && (
          <span className="text-muted-foreground tabular-nums">
            {Math.round(model.contextWindow / 1000)}k
          </span>
        )}
      </div>
    </div>
  );
}

function RegistryProviderCard({ provider, isDefault, enabledModels, onSetDefault, onConfigureKey, onConfigureModels }: RegistryProviderCardProps) {
  const { t } = useTranslation('common');
  const [expanded, setExpanded] = useState(false);

  // Filter models based on enabled list if present
  const availableModels = useMemo(() => {
    if (!enabledModels) return provider.models;
    const enabledSet = new Set(enabledModels);
    return provider.models.filter(m => enabledSet.has(m.id));
  }, [provider.models, enabledModels]);

  const agenticModels = availableModels.filter((m) => m.toolCall);
  const modelCount = provider.models.length;
  const availableCount = availableModels.length;
  const isRestricted = !!enabledModels;

  const itemData = useMemo(() => ({ models: agenticModels, t }), [agenticModels, t]);

  return (
    <div
      className="border rounded-lg overflow-hidden transition-colors hover:border-border/80 group"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-md bg-muted flex items-center justify-center">
              <ModelSelectorLogo provider={provider.id} className="size-5" />
            </div>

            <HoverCard openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-medium leading-none">{provider.name}</h4>
                    {isDefault && (
                      <Badge variant="secondary" className="text-xs h-5 px-1.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        {t('settings.ai.default')}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs gap-1 h-5 px-1.5">
                      <Zap className="h-3 w-3" />
                      {t('settings.ai.builtIn')}
                    </Badge>
                    {provider.isConfigured ? (
                      <Badge variant="outline" className="text-xs gap-1 h-5 px-1.5 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                        <CheckCircle className="h-3 w-3" />
                        {t('settings.ai.keyConfigured')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs gap-1 h-5 px-1.5">
                        <AlertCircle className="h-3 w-3" />
                        {t('settings.ai.noKey')}
                      </Badge>
                    )}
                    {isRestricted && (
                      <Badge variant="secondary" className="text-xs gap-1 h-5 px-1.5">
                        <ListFilter className="h-3 w-3" />
                        {t('settings.ai.restricted')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded inline-block">
                    <span>{provider.id}</span>
                    <span className="mx-1.5">•</span>
                    <span>{availableCount} {t('settings.ai.modelsAvailable')}</span>
                    {isRestricted && (
                      <span className="text-muted-foreground/60"> ({t('settings.ai.outOfTotal', { total: modelCount })})</span>
                    )}
                  </p>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-72">
                <div className="space-y-2 text-sm">
                  <div className="font-semibold">{t('settings.ai.details.title')}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('settings.ai.details.providerId')}: <span className="font-mono text-foreground">{provider.id}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('settings.ai.details.modelCount', { count: modelCount, agentic: agenticModels.length })}
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 ml-2 gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                onConfigureKey();
              }}
            >
              <Key className="h-3.5 w-3.5" />
              {t('settings.ai.apiKey')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                onConfigureModels();
              }}
            >
              <Settings className="h-3.5 w-3.5" />
              {t('settings.ai.models')}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onSetDefault} disabled={isDefault}>
                  <Star className={cn("h-4 w-4 mr-2", isDefault && "fill-current")} />
                  {t('settings.ai.setDefault')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Model preview / expand toggle */}
        {agenticModels.length > 0 && (
          <div className="mt-4 pl-[56px]">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 -ml-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              <ChevronDown className={`h-3.5 w-3.5 mr-1.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              {expanded ? t('settings.ai.hideModels') : t('settings.ai.showModels')}
            </Button>
          </div>
        )}
      </div>

      {/* Expanded models list with virtual scroll */}
      {expanded && agenticModels.length > 0 && (
        <div className="border-t bg-muted/30 pl-[72px] pr-4 py-3">
          <List
            rowCount={agenticModels.length}
            rowHeight={28}
            rowProps={itemData}
            style={{ height: Math.min(agenticModels.length * 28, 400), width: '100%' }}
            rowComponent={ModelRow}
          />
        </div>
      )}
    </div>
  );
}

/** Custom Provider Card - for user-defined providers not in registry */
interface CustomProviderCardProps {
  provider: Provider;
  isDefault: boolean;
  onSetDefault: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CustomProviderCard({ provider, isDefault, onSetDefault, onEdit, onDelete }: CustomProviderCardProps) {
  const { t } = useTranslation('common');
  return (
    <div
      className="border rounded-lg p-4 transition-colors hover:border-border/80 group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-md bg-muted flex items-center justify-center">
            <Wrench className="h-5 w-5 text-muted-foreground" />
          </div>

          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-medium leading-none">{provider.name}</h4>
                  {isDefault && (
                    <Badge variant="secondary" className="text-xs h-5 px-1.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      {t('settings.ai.default')}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs gap-1 h-5 px-1.5">
                    <Wrench className="h-3 w-3" />
                    {t('settings.ai.custom')}
                  </Badge>
                  {provider.hasApiKey ? (
                    <Badge variant="outline" className="text-xs gap-1 h-5 px-1.5 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                      <CheckCircle className="h-3 w-3" />
                      {t('settings.ai.keyConfigured')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs gap-1 h-5 px-1.5">
                      <AlertCircle className="h-3 w-3" />
                      {t('settings.ai.noKey')}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded inline-block">
                  <span>{provider.id}</span>
                  {provider.baseURL && (
                    <>
                      <span className="mx-1.5">•</span>
                      <span className="truncate">{provider.baseURL}</span>
                    </>
                  )}
                  <span className="mx-1.5">•</span>
                  <span>{provider.models.length} {t('settings.ai.models')}</span>
                </p>
              </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-72">
              <div className="space-y-2 text-sm">
                <div className="font-semibold">{t('settings.ai.details.title')}</div>
                <div className="text-xs text-muted-foreground">
                  {t('settings.ai.details.providerId')}: <span className="font-mono text-foreground">{provider.id}</span>
                </div>
                {provider.baseURL && (
                  <div className="text-xs text-muted-foreground">
                    {t('settings.ai.details.baseUrl')}: <span className="text-foreground">{provider.baseURL}</span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {t('settings.ai.details.modelCount', { count: provider.models.length, agentic: provider.models.length })}
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 ml-2 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={onEdit}
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            {t('settings.ai.configure')}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onSetDefault} disabled={isDefault}>
                <Star className={cn("h-4 w-4 mr-2", isDefault && "fill-current")} />
                {t('settings.ai.setDefault')}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}



import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@leanspec/ui-components';

interface ProviderApiKeyDialogProps {
  provider: RegistryProvider;
  onSave: (apiKey: string, baseUrl?: string) => Promise<void>;
  onCancel: () => void;
}

function ProviderApiKeyDialog({ provider, onSave, onCancel }: ProviderApiKeyDialogProps) {
  const { t } = useTranslation('common');

  // API Key State
  const [apiKey, setApiKey] = useState('');
  const [resourceName, setResourceName] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  // API Key Checks
  const requiredEnvVars = provider.requiredEnvVars ?? [];
  const isAzure = provider.id === 'azure' || requiredEnvVars.some(v => v.includes('AZURE_RESOURCE_NAME'));

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setKeyError(t('settings.ai.errors.apiKeyRequired'));
      return;
    }
    if (isAzure && !resourceName.trim()) {
      setKeyError(t('settings.ai.errors.azureResourceNameRequired'));
      return;
    }
    try {
      setSavingKey(true);
      setKeyError(null);

      // For Azure, construct the base URL from resource name
      let baseUrl: string | undefined;
      if (isAzure && resourceName.trim()) {
        baseUrl = `https://${resourceName.trim()}.openai.azure.com/openai`;
      }

      await onSave(apiKey.trim(), baseUrl);
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : t('settings.ai.errors.saveFailed'));
    } finally {
      setSavingKey(false);
    }
  };

  const handleClearApiKey = async () => {
    try {
      setSavingKey(true);
      setKeyError(null);
      await onSave('');
      setApiKey('');
      setResourceName('');
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : t('settings.ai.errors.saveFailed'));
    } finally {
      setSavingKey(false);
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 shrink-0 rounded-md bg-muted flex items-center justify-center border">
              <ModelSelectorLogo provider={provider.id} className="size-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DialogTitle>{t('settings.ai.configureProvider', { provider: provider.name })}</DialogTitle>
                {provider.isConfigured ? (
                  <Badge variant="outline" className="text-xs gap-1 h-5 px-1.5 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                    <CheckCircle className="h-3 w-3" />
                    {t('settings.ai.keyConfigured')}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs gap-1 h-5 px-1.5">
                    <AlertCircle className="h-3 w-3" />
                    {t('settings.ai.noKey')}
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-left">{t('settings.ai.configureProviderDescription')}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            {isAzure
              ? t('settings.ai.azureApiKeyDialogDescription', { provider: provider.name })
              : t('settings.ai.apiKeyDialogDescription', { provider: provider.name })
            }
          </div>

          {isAzure && (
            <div className="space-y-2">
              <Label htmlFor="azure-resource-name">{t('settings.ai.azureResourceName')} <span className="text-destructive">*</span></Label>
              <Input
                id="azure-resource-name"
                type="text"
                value={resourceName}
                onChange={(e) => setResourceName(e.target.value)}
                placeholder={t('settings.ai.placeholders.azureResourceName')}
              />
              <p className="text-xs text-muted-foreground">{t('settings.ai.azureResourceNameHelp')}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="api-key">{t('settings.ai.apiKey')} <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t('settings.ai.placeholders.apiKeyEnv', { provider: isAzure ? 'AZURE' : provider.id.toUpperCase() })}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {keyError && <p className="text-xs text-destructive">{keyError}</p>}
            <p className="text-xs text-muted-foreground">{t('settings.ai.apiKeyStorageNote')}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t('actions.close')}
          </Button>
          {provider.isConfigured && (
            <Button variant="destructive" onClick={handleClearApiKey} disabled={savingKey}>
              {t('settings.ai.clearApiKey')}
            </Button>
          )}
          <Button onClick={handleSaveApiKey} disabled={savingKey}>
            {savingKey ? t('actions.saving') : t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ModelSortField = 'name' | 'tokens';
type ModelSortDirection = 'asc' | 'desc';

interface ProviderModelsDialogProps {
  provider: RegistryProvider;
  initialEnabledModels: string[] | undefined;
  onSave: (models: string[] | undefined) => Promise<void>;
  onCancel: () => void;
}

function ProviderModelsDialog({ provider, initialEnabledModels, onSave, onCancel }: ProviderModelsDialogProps) {
  const { t } = useTranslation('common');

  // Models State
  const [isRestricted, setIsRestricted] = useState(!!initialEnabledModels);
  const [enabledSet, setEnabledSet] = useState<Set<string>>(
    new Set(initialEnabledModels ?? provider.models.map(m => m.id))
  );
  const [savingModels, setSavingModels] = useState(false);

  // Sorting State
  const [sortField, setSortField] = useState<ModelSortField>('name');
  const [sortDirection, setSortDirection] = useState<ModelSortDirection>('asc');

  // Track if user has interacted with selection (to avoid auto-selecting after manual deselect)
  const hasUserInteracted = useRef(false);

  // Models Effects - only auto-select all when first enabling restriction mode
  useEffect(() => {
    // Skip if user has already interacted with the selection
    if (hasUserInteracted.current) return;

    if (isRestricted && enabledSet.size === 0 && !initialEnabledModels) {
      // Only auto-select all models when first turning on restriction mode with no prior config
      setEnabledSet(new Set(provider.models.map(m => m.id)));
    }
  }, [isRestricted, provider.models, initialEnabledModels, enabledSet.size]);

  // Sorted models
  const sortedModels = useMemo(() => {
    return [...provider.models].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'tokens') {
        const aTokens = a.contextWindow ?? 0;
        const bTokens = b.contextWindow ?? 0;
        comparison = aTokens - bTokens;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [provider.models, sortField, sortDirection]);

  const toggleSort = (field: ModelSortField) => {
    if (sortField === field) {
      // Toggle direction
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Change field, default to asc
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleModel = (id: string) => {
    hasUserInteracted.current = true;
    const next = new Set(enabledSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setEnabledSet(next);
  };

  const toggleAll = () => {
    hasUserInteracted.current = true;
    if (enabledSet.size === provider.models.length) {
      setEnabledSet(new Set());
    } else {
      setEnabledSet(new Set(provider.models.map(m => m.id)));
    }
  };

  const handleSaveModels = async () => {
    try {
      setSavingModels(true);
      if (!isRestricted) {
        await onSave(undefined);
      } else {
        await onSave(Array.from(enabledSet));
      }
    } catch {
      // Error handled by parent usually, but we should probably handle it here
    } finally {
      setSavingModels(false);
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0 border-b">
          <DialogTitle>{t('settings.ai.configureModels', { provider: provider.name })}</DialogTitle>
          <DialogDescription>{t('settings.ai.configureModelsDescription')}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-6 py-2 shrink-0 flex items-center justify-between border-b bg-muted/20">
            <div className="flex items-center space-x-2">
              <Switch
                id="restrict-mode"
                checked={isRestricted}
                onCheckedChange={setIsRestricted}
              />
              <Label htmlFor="restrict-mode" className="font-medium">
                {t('settings.ai.restrictModels')}
              </Label>
            </div>

            {isRestricted && (
              <div className="text-sm text-muted-foreground">
                {enabledSet.size} {t('settings.ai.selectedOf')} {provider.models.length}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 relative">
            {!isRestricted ? (
              <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-muted-foreground bg-muted/10">
                <div>
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <h3 className="text-lg font-medium text-foreground mb-2">{t('settings.ai.allModelsEnabled')}</h3>
                  <p className="max-w-xs mx-auto text-sm">{t('settings.ai.allModelsEnabledDesc')}</p>
                  <Button variant="outline" className="mt-6" onClick={() => setIsRestricted(true)}>
                    {t('settings.ai.enableRestriction')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col">
                <div className="p-2 border-b flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-2">{t('settings.ai.modelSort.sortBy')}:</span>
                    <Button
                      variant={sortField === 'name' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => toggleSort('name')}
                      className="text-xs h-7 gap-1"
                    >
                      {t('settings.ai.modelSort.name')}
                      {sortField === 'name' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant={sortField === 'tokens' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => toggleSort('tokens')}
                      className="text-xs h-7 gap-1"
                    >
                      {t('settings.ai.modelSort.tokens')}
                      {sortField === 'tokens' && (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs h-7">
                    {enabledSet.size === provider.models.length ? t('settings.ai.deselectAll') : t('settings.ai.selectAll')}
                  </Button>
                </div>
                <Command className="border-none">
                  <CommandInput placeholder={t('chat.searchModels')} className="border-none focus:ring-0" />
                  <CommandList className="max-h-full">
                    <CommandEmpty>{t('chat.noModelsFound')}</CommandEmpty>
                    <CommandGroup>
                      {sortedModels.map(model => (
                        <CommandItem
                          key={model.id}
                          value={`${model.name} ${model.id}`}
                          onSelect={() => toggleModel(model.id)}
                          className="flex items-center gap-3 py-2 cursor-pointer"
                        >
                          <div className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            enabledSet.has(model.id)
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}>
                            <Check className={cn("h-3 w-3")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{model.name}</span>
                              {model.toolCall && <Badge variant="secondary" className="text-[10px] h-4 px-1">{t('chat.modelSelector.badges.tool')}</Badge>}
                              {model.contextWindow && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 font-mono">
                                  {Math.round(model.contextWindow / 1000)}k
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono truncate">{model.id}</div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            )}
          </div>

          <div className="p-4 border-t flex justify-end gap-2 bg-muted/10">
            <Button variant="outline" onClick={onCancel}>
              {t('actions.close')}
            </Button>
            <Button onClick={handleSaveModels} disabled={savingModels}>
              {savingModels ? t('actions.saving') : t('actions.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Custom Provider Dialog - full provider configuration */
interface CustomProviderDialogProps {
  provider: Provider | null;
  existingIds: string[];
  onSave: (provider: Provider) => Promise<void>;
  onCancel: () => void;
}

function CustomProviderDialog({ provider, existingIds, onSave, onCancel }: CustomProviderDialogProps) {
  const { t } = useTranslation('common');
  const [formData, setFormData] = useState({
    id: provider?.id ?? '',
    name: provider?.name ?? '',
    baseURL: provider?.baseURL ?? '',
    apiKey: '',
    models: provider?.models ?? [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [newModel, setNewModel] = useState({ id: '', name: '' });

  const isEditing = !!provider;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.id.trim()) {
      newErrors.id = t('settings.ai.errors.idRequired');
    } else if (!isEditing && existingIds.includes(formData.id)) {
      newErrors.id = t('settings.ai.errors.idExists');
    } else if (!/^[a-z0-9-]+$/.test(formData.id)) {
      newErrors.id = t('settings.ai.errors.idInvalid');
    }

    if (!formData.name.trim()) {
      newErrors.name = t('settings.ai.errors.nameRequired');
    }

    if (formData.baseURL && !formData.baseURL.match(/^https?:\/\//)) {
      newErrors.baseURL = t('settings.ai.errors.urlInvalid');
    }

    if (!isEditing && !formData.apiKey.trim()) {
      newErrors.apiKey = t('settings.ai.errors.apiKeyRequired');
    }

    if (formData.models.length === 0) {
      newErrors.models = t('settings.ai.errors.modelsRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddModel = () => {
    if (!newModel.id.trim() || !newModel.name.trim()) return;
    if (formData.models.some((m) => m.id === newModel.id)) return;

    setFormData({
      ...formData,
      models: [...formData.models, { id: newModel.id, name: newModel.name }],
    });
    setNewModel({ id: '', name: '' });
    setShowAddModel(false);
  };

  const handleRemoveModel = (modelId: string) => {
    setFormData({
      ...formData,
      models: formData.models.filter((m) => m.id !== modelId),
    });
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      const providerData: Provider = {
        id: formData.id,
        name: formData.name,
        baseURL: formData.baseURL || undefined,
        models: formData.models,
        hasApiKey: true,
        apiKey: formData.apiKey || provider?.apiKey,
      };

      await onSave(providerData);
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('settings.ai.editCustomProvider') : t('settings.ai.addCustomProvider')}
          </DialogTitle>
          <DialogDescription>{t('settings.ai.customProviderDialogDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="provider-id">
              {t('settings.ai.providerId')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="provider-id"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase() })}
              placeholder={t('settings.ai.placeholders.customProviderId')}
              disabled={isEditing}
            />
            {errors.id && <p className="text-xs text-destructive">{errors.id}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-name">
              {t('settings.ai.providerName')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="provider-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('settings.ai.placeholders.customProviderName')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-baseurl">
              {t('settings.ai.baseURL')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="provider-baseurl"
              value={formData.baseURL}
              onChange={(e) => setFormData({ ...formData, baseURL: e.target.value })}
              placeholder={t('settings.ai.placeholders.customProviderBaseUrl')}
            />
            {errors.baseURL && <p className="text-xs text-destructive">{errors.baseURL}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-apikey">
              {t('settings.ai.apiKey')} {!isEditing && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="provider-apikey"
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              placeholder={isEditing ? t('settings.ai.leaveEmptyToKeep') : t('settings.ai.placeholders.apiKeyPrefix')}
            />
            {errors.apiKey && <p className="text-xs text-destructive">{errors.apiKey}</p>}
          </div>

          {/* Models Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('settings.ai.models')} <span className="text-destructive">*</span></Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => setShowAddModel(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t('settings.ai.addModel')}
              </Button>
            </div>
            {errors.models && <p className="text-xs text-destructive">{errors.models}</p>}

            {showAddModel && (
              <div className="flex gap-2 p-2 border rounded bg-muted/30">
                <Input
                  placeholder={t('settings.ai.modelId')}
                  value={newModel.id}
                  onChange={(e) => setNewModel({ ...newModel, id: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder={t('settings.ai.modelName')}
                  value={newModel.name}
                  onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAddModel}>
                  {t('actions.add')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddModel(false)}>
                  {t('actions.cancel')}
                </Button>
              </div>
            )}

            <div className="space-y-1">
              {formData.models.map((model) => (
                <div key={model.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">{model.id}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="truncate">{model.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => handleRemoveModel(model.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {formData.models.length === 0 && !showAddModel && (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  {t('settings.ai.noModelsAdded')}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? t('actions.saving') : t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
