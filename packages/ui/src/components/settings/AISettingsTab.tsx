import { useState, useEffect, useMemo, useCallback } from 'react';
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  ModelSelectorLogo,
  cn,
} from '@leanspec/ui-components';
import { Plus, Trash2, Edit2, CheckCircle, AlertCircle, Key, RefreshCw, ChevronDown, Wrench, Eye, EyeOff, Zap, Brain, ImageIcon, MoreVertical, Star, XCircle, Loader2 } from 'lucide-react';
import type { ChatConfig, Provider } from '../../types/chat-config';
import type { RegistryProvider, RegistryModel } from '../../types/models-registry';
import { SearchFilterBar } from '../shared/SearchFilterBar';
import { useToast } from '../../contexts';



function Label({ htmlFor, children, className = '' }: { htmlFor?: string; children: React.ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>
      {children}
    </label>
  );
}

interface RegistryProviderRaw {
  id: string;
  name: string;
  env?: string[];
  api?: string;
  doc?: string;
  models?: Record<string, RegistryModelRaw>;
  isConfigured: boolean;
  configuredEnvVars?: string[];
}

interface RegistryModelRaw {
  id: string;
  name: string;
  tool_call?: boolean;
  reasoning?: boolean;
  modalities?: { input?: string[]; output?: string[] };
  limit?: { context?: number; output?: number };
}

type ValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid';

interface ProviderValidationState {
  status: ValidationStatus;
  error?: string;
  checkedAt?: number;
}

const PROVIDER_VALIDATION_TTL_MS = 5 * 60 * 1000;
const PROVIDER_VALIDATION_CACHE_KEY = 'settings-provider-validation-cache';

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString();
};

const readProviderValidationCache = (): Record<string, { valid: boolean; error?: string | null; checkedAt: number }> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PROVIDER_VALIDATION_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, { valid: boolean; error?: string | null; checkedAt: number }>;
    }
  } catch {
    return {};
  }
  return {};
};

const writeProviderValidationCache = (cache: Record<string, { valid: boolean; error?: string | null; checkedAt: number }>) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROVIDER_VALIDATION_CACHE_KEY, JSON.stringify(cache));
};

function toRegistryProvider(raw: RegistryProviderRaw): RegistryProvider {
  const models: RegistryModel[] = Object.values(raw.models ?? {}).map((m) => ({
    id: m.id,
    name: m.name,
    toolCall: Boolean(m.tool_call),
    reasoning: Boolean(m.reasoning),
    vision: m.modalities?.input?.includes('image') ?? false,
    contextWindow: m.limit?.context,
    maxOutput: m.limit?.output,
  }));
  // Sort: toolCall first, then by context window
  models.sort((a, b) => {
    if (a.toolCall !== b.toolCall) return b.toolCall ? 1 : -1;
    return (b.contextWindow ?? 0) - (a.contextWindow ?? 0);
  });
  return {
    id: raw.id,
    name: raw.name,
    isConfigured: raw.isConfigured,
    configuredEnvVars: raw.configuredEnvVars ?? [],
    models,
  };
}

function isRegistryProvider(p: RegistryProvider | Provider): p is RegistryProvider {
  return 'isConfigured' in p;
}

export function AISettingsTab() {
  const { t } = useTranslation('common');
  const { toast } = useToast();

  // Registry providers (from models.dev)
  const [registryProviders, setRegistryProviders] = useState<RegistryProvider[]>([]);
  const [registryLoading, setRegistryLoading] = useState(true);
  const [registryError, setRegistryError] = useState<string | null>(null);

  // Chat config (for defaults and custom providers)
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // UI state
  const [showApiKeyDialog, setShowApiKeyDialog] = useState<string | null>(null);
  const [showCustomProviderDialog, setShowCustomProviderDialog] = useState(false);
  const [editingCustomProvider, setEditingCustomProvider] = useState<Provider | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [providerValidation, setProviderValidation] = useState<Record<string, ProviderValidationState>>({});
  const [validatingProviders, setValidatingProviders] = useState<Record<string, boolean>>({});
  const [validatingAllProviders, setValidatingAllProviders] = useState(false);
  const [autoValidated, setAutoValidated] = useState(false);

  // Filter/Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'models' | 'configured'>('name');
  const [filterConfigured, setFilterConfigured] = useState(false);
  const [filterUnconfigured, setFilterUnconfigured] = useState(false);

  // Load registry providers
  const loadRegistry = async () => {
    try {
      setRegistryLoading(true);
      const res = await fetch('/api/models/providers?agenticOnly=true');
      if (!res.ok) throw new Error('Failed to load models registry');
      const data = await res.json();
      const providers = (data.providers ?? []).map(toRegistryProvider);
      setRegistryProviders(providers);
      setRegistryError(null);
    } catch (err) {
      setRegistryError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRegistryLoading(false);
    }
  };

  // Load chat config
  const loadConfig = async () => {
    try {
      setConfigLoading(true);
      const res = await fetch('/api/chat/config');
      if (!res.ok) throw new Error('Failed to load config');
      const data = await res.json();
      setConfig(data);
    } catch {
      // Config load failure is not critical for registry-based UI
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    loadRegistry();
    loadConfig();
  }, []);


  const updateProviderValidationCache = (providerId: string, valid: boolean, error?: string | null) => {
    const cache = readProviderValidationCache();
    cache[providerId] = {
      valid,
      error,
      checkedAt: Date.now(),
    };
    writeProviderValidationCache(cache);
  };

  const parseValidationError = useCallback(async (response: Response) => {
    try {
      const data = await response.json();
      if (data?.error?.message) return data.error.message as string;
      if (data?.message) return data.message as string;
    } catch {
      // ignore
    }
    return response.statusText || t('errors.unknownError');
  }, [t]);

  const validateProvider = useCallback(async (providerId: string) => {
    if (!config) return;
    setValidatingProviders((prev) => ({ ...prev, [providerId]: true }));
    setProviderValidation((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        status: 'checking',
      },
    }));

    const providerConfig = config.providers.find((provider) => provider.id === providerId);
    const modelId = providerConfig?.models?.[0]?.id;

    try {
      const response = await fetch('/api/chat/config/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, modelId }),
      });

      if (!response.ok) {
        const message = await parseValidationError(response);
        updateProviderValidationCache(providerId, false, message);
        setProviderValidation((prev) => ({
          ...prev,
          [providerId]: {
            status: 'invalid',
            error: message,
            checkedAt: Date.now(),
          },
        }));
        return;
      }

      const data = await response.json();
      const isValid = Boolean(data?.valid);
      const errorMessage = data?.error ?? null;

      updateProviderValidationCache(providerId, isValid, errorMessage);
      setProviderValidation((prev) => ({
        ...prev,
        [providerId]: {
          status: isValid ? 'valid' : 'invalid',
          error: errorMessage || undefined,
          checkedAt: Date.now(),
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.unknownError');
      updateProviderValidationCache(providerId, false, message);
      setProviderValidation((prev) => ({
        ...prev,
        [providerId]: {
          status: 'invalid',
          error: message,
          checkedAt: Date.now(),
        },
      }));
    } finally {
      setValidatingProviders((prev) => {
        const next = { ...prev };
        delete next[providerId];
        return next;
      });
    }
  }, [config, parseValidationError, t]);

  // Identify custom providers (in config but not in registry)
  const customProviders = useMemo(() => {
    if (!config) return [];
    const registryIds = new Set(registryProviders.map((p) => p.id));
    return config.providers.filter((p) => !registryIds.has(p.id));
  }, [config, registryProviders]);

  const configuredProviderIds = useMemo(() => {
    const ids = new Set<string>();
    registryProviders.forEach((provider) => {
      if (provider.isConfigured) ids.add(provider.id);
    });
    customProviders.forEach((provider) => {
      if (provider.hasApiKey) ids.add(provider.id);
    });
    return Array.from(ids);
  }, [registryProviders, customProviders]);

  const handleRevalidateProviders = async () => {
    if (configuredProviderIds.length === 0) return;
    setValidatingAllProviders(true);
    await Promise.allSettled(configuredProviderIds.map((providerId) => validateProvider(providerId)));
    setValidatingAllProviders(false);
  };

  useEffect(() => {
    if (autoValidated || configuredProviderIds.length === 0) return;
    const cache = readProviderValidationCache();
    const now = Date.now();
    const cachedState: Record<string, ProviderValidationState> = {};
    const toValidate: string[] = [];

    configuredProviderIds.forEach((providerId) => {
      const cached = cache[providerId];
      if (cached && now - cached.checkedAt < PROVIDER_VALIDATION_TTL_MS) {
        cachedState[providerId] = {
          status: cached.valid ? 'valid' : 'invalid',
          error: cached.error ?? undefined,
          checkedAt: cached.checkedAt,
        };
      } else {
        toValidate.push(providerId);
      }
    });

    if (Object.keys(cachedState).length > 0) {
      setProviderValidation((prev) => ({ ...prev, ...cachedState }));
    }

    if (toValidate.length === 0) {
      setAutoValidated(true);
      return;
    }

    setValidatingAllProviders(true);
    Promise.allSettled(toValidate.map((providerId) => validateProvider(providerId))).finally(() => {
      setValidatingAllProviders(false);
      setAutoValidated(true);
    });
  }, [autoValidated, configuredProviderIds, validateProvider]);

  // Refresh registry from models.dev
  const handleRefreshRegistry = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/models/refresh', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to refresh');
      await loadRegistry();
    } catch {
      // Ignore refresh errors
    } finally {
      setRefreshing(false);
    }
  };

  // Set API key for a provider
  const handleSetApiKey = async (providerId: string, apiKey: string) => {
    try {
      const res = await fetch(`/api/models/providers/${providerId}/key`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      if (!res.ok) throw new Error('Failed to set API key');
      // Reload both registry and config
      await Promise.all([loadRegistry(), loadConfig()]);
      void validateProvider(providerId);
    } catch (err) {
      throw err;
    }
  };

  // Save config (for defaults)
  const saveConfig = async (newConfig: ChatConfig) => {
    const res = await fetch('/api/chat/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig),
    });
    if (!res.ok) throw new Error('Failed to save config');
    const data = await res.json();
    setConfig(data);
  };

  const handleUpdateDefaults = async (field: 'maxSteps' | 'defaultProviderId' | 'defaultModelId', value: string | number) => {
    if (!config) return;

    const newSettings = { ...config.settings, [field]: value };

    if (field === 'defaultProviderId') {
      // Find model from registry or config
      const regProvider = registryProviders.find((p) => p.id === value);
      const cfgProvider = config.providers.find((p) => p.id === value);
      const firstModel = regProvider?.models[0]?.id ?? cfgProvider?.models[0]?.id ?? '';
      newSettings.defaultModelId = firstModel;
    }

    await saveConfig({ ...config, settings: newSettings });
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

    await saveConfig({ ...config, providers: newProviders });
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

    await saveConfig(newConfig);
  };

  useEffect(() => {
    setAutoValidated(false);
  }, [configuredProviderIds.join('|')]);

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
      if (filterConfigured && !isConfigured) return false;
      if (filterUnconfigured && isConfigured) return false;

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
  }, [registryProviders, customProviders, searchQuery, sortBy, filterConfigured, filterUnconfigured]);

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
        <Button onClick={loadRegistry} className="mt-4">
          {t('actions.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Registry Providers Section */}
      <section className="space-y-4 relative">
        <div className="sticky top-0 bg-background z-10 pb-2 -mt-1 pt-1 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">{t('settings.ai.providers')}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{t('settings.ai.providersDescription')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingCustomProvider(null);
                  setShowCustomProviderDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('settings.ai.addCustomProvider')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevalidateProviders}
                disabled={validatingAllProviders || configuredProviderIds.length === 0}
              >
                <Loader2 className={`h-4 w-4 mr-2 ${validatingAllProviders ? 'animate-spin' : ''}`} />
                {t('settings.ai.validation.revalidateAll')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefreshRegistry} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {t('settings.ai.refreshRegistry')}
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
                options: [
                  {
                    id: 'configured',
                    label: t('settings.ai.filters.showConfiguredOnly'),
                    checked: filterConfigured,
                    onCheckedChange: setFilterConfigured
                  },
                  {
                    id: 'unconfigured',
                    label: t('settings.ai.filters.showUnconfiguredOnly'),
                    checked: filterUnconfigured,
                    onCheckedChange: setFilterUnconfigured
                  }
                ]
              }
            ]}
            resultCount={filteredProviders.length}
            totalCount={registryProviders.length + customProviders.length}
          />
        </div>

        <div className="space-y-3">
          {filteredProviders.map((provider) => {
            const isRegistry = isRegistryProvider(provider);
            if (isRegistry) {
              return (
                <RegistryProviderCard
                  key={provider.id}
                  provider={provider}
                  isDefault={config?.settings.defaultProviderId === provider.id}
                  validation={providerValidation[provider.id]}
                  isValidating={Boolean(validatingProviders[provider.id])}
                  onConfigureKey={() => setShowApiKeyDialog(provider.id)}
                />
              );
            }
            return (
              <CustomProviderCard
                key={provider.id}
                provider={provider}
                isDefault={config?.settings.defaultProviderId === provider.id}
                validation={providerValidation[provider.id]}
                isValidating={Boolean(validatingProviders[provider.id])}
                onEdit={() => {
                  setEditingCustomProvider(provider);
                  setShowCustomProviderDialog(true);
                }}
                onDelete={() => handleDeleteCustomProvider(provider.id)}
              />
            );
          })}
        </div>
      </section>





      {/* API Key Dialog */}
      {showApiKeyDialog && (
        <ApiKeyDialog
          providerId={showApiKeyDialog}
          providerName={registryProviders.find((p) => p.id === showApiKeyDialog)?.name ?? showApiKeyDialog}
          isDefault={config?.settings.defaultProviderId === showApiKeyDialog}
          onSave={async (apiKey) => {
            await handleSetApiKey(showApiKeyDialog, apiKey);
            setShowApiKeyDialog(null);
          }}
          onSetDefault={async (apiKey) => {
            await handleSetApiKey(showApiKeyDialog, apiKey);
            await handleSetDefaultProvider(showApiKeyDialog);
            setShowApiKeyDialog(null);
          }}
          onCancel={() => setShowApiKeyDialog(null)}
        />
      )}

      {/* Custom Provider Dialog */}
      {showCustomProviderDialog && (
        <CustomProviderDialog
          provider={editingCustomProvider}
          isDefault={editingCustomProvider ? config?.settings.defaultProviderId === editingCustomProvider.id : false}
          existingIds={[...registryProviders.map((p) => p.id), ...customProviders.map((p) => p.id)]}
          onSave={async (provider) => {
            await handleSaveCustomProvider(provider);
            setShowCustomProviderDialog(false);
            setEditingCustomProvider(null);
          }}
          onSetDefault={async (provider) => {
            await handleSaveCustomProvider(provider);
            await handleSetDefaultProvider(provider.id);
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
  validation?: ProviderValidationState;
  isValidating?: boolean;
  onConfigureKey: () => void;
}

function RegistryProviderCard({ provider, isDefault, validation, isValidating, onConfigureKey }: RegistryProviderCardProps) {
  const { t } = useTranslation('common');
  const [expanded, setExpanded] = useState(false);

  const agenticModels = provider.models.filter((m) => m.toolCall);
  const modelCount = provider.models.length;
  const agenticCount = agenticModels.length;
  const validationStatus: ValidationStatus = isValidating ? 'checking' : validation?.status ?? 'idle';
  const lastCheckedLabel = formatTimestamp(validation?.checkedAt);

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
                    {provider.isConfigured && validationStatus !== 'idle' && (
                      <Badge
                        variant={validationStatus === 'invalid' ? 'destructive' : 'outline'}
                        className={cn(
                          'text-xs gap-1 h-5 px-1.5',
                          validationStatus === 'valid' && 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                        )}
                      >
                        {validationStatus === 'checking' && <Loader2 className="h-3 w-3 animate-spin" />}
                        {validationStatus === 'valid' && <CheckCircle className="h-3 w-3" />}
                        {validationStatus === 'invalid' && <XCircle className="h-3 w-3" />}
                        {validationStatus === 'checking'
                          ? t('settings.ai.validation.checking')
                          : validationStatus === 'valid'
                            ? t('settings.ai.validation.valid')
                            : t('settings.ai.validation.invalid')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded inline-block">
                    <span>{provider.id}</span>
                    <span className="mx-1.5">•</span>
                    <span>{agenticCount} {t('settings.ai.agenticModels')}</span>
                    {modelCount > agenticCount && (
                      <span className="text-muted-foreground/60"> ({modelCount} {t('settings.ai.total')})</span>
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
                    {t('settings.ai.details.modelCount', { count: modelCount, agentic: agenticCount })}
                  </div>
                  {provider.isConfigured && lastCheckedLabel && (
                    <div className="text-xs text-muted-foreground">
                      {t('settings.ai.validation.lastChecked', { time: lastCheckedLabel })}
                    </div>
                  )}
                  {validation?.error && (
                    <div className="text-xs text-destructive">{validation.error}</div>
                  )}
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant={provider.isConfigured ? 'ghost' : 'default'} // Highlight if not configured (call to action)
              size="sm"
              className={cn("h-8 ml-2", provider.isConfigured && "text-muted-foreground hover:text-foreground hover:bg-muted")}
              onClick={(e) => {
                e.stopPropagation();
                onConfigureKey();
              }}
            >
              <Key className="h-3.5 w-3.5 mr-1.5" />
              {provider.isConfigured ? t('settings.ai.configure') : t('settings.ai.setUp')}
            </Button>
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

      {/* Expanded models list */}
      {expanded && agenticModels.length > 0 && (
        <div className="border-t bg-muted/30 pl-[72px] pr-4 py-3">
          <div className="space-y-1.5">
            {agenticModels.slice(0, 10).map((model) => (
              <div key={model.id} className="flex items-center gap-2 text-xs">
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
            ))}
            {agenticModels.length > 10 && (
              <p className="text-xs text-muted-foreground pt-1">
                +{agenticModels.length - 10} {t('settings.ai.moreModels')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Custom Provider Card - for user-defined providers not in registry */
interface CustomProviderCardProps {
  provider: Provider;
  isDefault: boolean;
  validation?: ProviderValidationState;
  isValidating?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function CustomProviderCard({ provider, isDefault, validation, isValidating, onEdit, onDelete }: CustomProviderCardProps) {
  const { t } = useTranslation('common');
  const validationStatus: ValidationStatus = isValidating ? 'checking' : validation?.status ?? 'idle';
  const lastCheckedLabel = formatTimestamp(validation?.checkedAt);

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
                  {provider.hasApiKey && validationStatus !== 'idle' && (
                    <Badge
                      variant={validationStatus === 'invalid' ? 'destructive' : 'outline'}
                      className={cn(
                        'text-xs gap-1 h-5 px-1.5',
                        validationStatus === 'valid' && 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                      )}
                    >
                      {validationStatus === 'checking' && <Loader2 className="h-3 w-3 animate-spin" />}
                      {validationStatus === 'valid' && <CheckCircle className="h-3 w-3" />}
                      {validationStatus === 'invalid' && <XCircle className="h-3 w-3" />}
                      {validationStatus === 'checking'
                        ? t('settings.ai.validation.checking')
                        : validationStatus === 'valid'
                          ? t('settings.ai.validation.valid')
                          : t('settings.ai.validation.invalid')}
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
                {provider.hasApiKey && lastCheckedLabel && (
                  <div className="text-xs text-muted-foreground">
                    {t('settings.ai.validation.lastChecked', { time: lastCheckedLabel })}
                  </div>
                )}
                {validation?.error && (
                  <div className="text-xs text-destructive">{validation.error}</div>
                )}
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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


/** API Key Dialog - simple dialog for setting API key */
interface ApiKeyDialogProps {
  providerId: string;
  providerName: string;
  isDefault: boolean;
  onSave: (apiKey: string) => Promise<void>;
  onSetDefault: (apiKey: string) => Promise<void>;
  onCancel: () => void;
}

function ApiKeyDialog({ providerId, providerName, isDefault, onSave, onSetDefault, onCancel }: ApiKeyDialogProps) {
  const { t } = useTranslation('common');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (setDefault: boolean = false) => {
    if (!apiKey.trim()) {
      setError(t('settings.ai.errors.apiKeyRequired'));
      return;
    }
    try {
      setSaving(true);
      setError(null);
      if (setDefault) {
        await onSetDefault(apiKey.trim());
      } else {
        await onSave(apiKey.trim());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings.ai.configureApiKey')}</DialogTitle>
          <DialogDescription>
            {t('settings.ai.apiKeyDialogDescription', { provider: providerName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="api-key">{t('settings.ai.apiKey')}</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`${providerId.toUpperCase()}_API_KEY`}
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
            {error && <p className="text-xs text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">{t('settings.ai.apiKeyStorageNote')}</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <div className="flex-1 flex gap-2 justify-start">
            {!isDefault && (
              <Button type="button" variant="secondary" onClick={() => handleSubmit(true)} disabled={saving}>
                <Star className="h-4 w-4 mr-2" />
                {t('settings.ai.saveAndSetDefault')}
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={saving}>
            {saving ? t('actions.saving') : t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Custom Provider Dialog - full provider configuration */
interface CustomProviderDialogProps {
  provider: Provider | null;
  isDefault: boolean;
  existingIds: string[];
  onSave: (provider: Provider) => Promise<void>;
  onSetDefault: (provider: Provider) => Promise<void>;
  onCancel: () => void;
}

function CustomProviderDialog({ provider, isDefault, existingIds, onSave, onSetDefault, onCancel }: CustomProviderDialogProps) {
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

  const handleSubmit = async (setDefault: boolean = false) => {
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

      if (setDefault) {
        await onSetDefault(providerData);
      } else {
        await onSave(providerData);
      }
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
              placeholder="my-provider"
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
              placeholder="My Provider"
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
              placeholder="https://api.example.com/v1"
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
              placeholder={isEditing ? t('settings.ai.leaveEmptyToKeep') : 'sk-...'}
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
          <div className="flex-1 flex gap-2 justify-start">
            {!isDefault && (
              <Button type="button" variant="secondary" onClick={() => handleSubmit(true)} disabled={saving}>
                <Star className="h-4 w-4 mr-2" />
                {t('settings.ai.saveAndSetDefault')}
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={saving}>
            {saving ? t('actions.saving') : t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
