import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@leanspec/ui-components';
import { Plus, Trash2, Edit2, CheckCircle, AlertCircle, Key, RefreshCw, ChevronDown, Wrench, Eye, EyeOff, Zap, Brain, ImageIcon } from 'lucide-react';
import type { ChatConfig, Provider } from '../../types/chat-config';
import type { RegistryProvider, RegistryModel } from '../../types/models-registry';

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

export function AISettingsTab() {
  const { t } = useTranslation('common');

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
      setShowApiKeyDialog(null);
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
    setShowCustomProviderDialog(false);
    setEditingCustomProvider(null);
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

  // Identify custom providers (in config but not in registry)
  const customProviders = useMemo(() => {
    if (!config) return [];
    const registryIds = new Set(registryProviders.map((p) => p.id));
    return config.providers.filter((p) => !registryIds.has(p.id));
  }, [config, registryProviders]);

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

  // Split providers into configured and unconfigured
  const configuredProviders = registryProviders.filter((p) => p.isConfigured);
  const unconfiguredProviders = registryProviders.filter((p) => !p.isConfigured);

  return (
    <div className="space-y-8">
      {/* Registry Providers Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">{t('settings.ai.providers')}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{t('settings.ai.providersDescription')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefreshRegistry} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {t('settings.ai.refreshRegistry')}
          </Button>
        </div>

        {/* Configured Providers */}
        {configuredProviders.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">{t('settings.ai.configuredProviders')}</h4>
            {configuredProviders.map((provider) => (
              <RegistryProviderCard
                key={provider.id}
                provider={provider}
                onConfigureKey={() => setShowApiKeyDialog(provider.id)}
              />
            ))}
          </div>
        )}

        {/* Unconfigured Providers */}
        {unconfiguredProviders.length > 0 && (
          <Collapsible defaultOpen={configuredProviders.length === 0}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto hover:bg-accent/50">
                <span className="text-sm font-medium text-muted-foreground">
                  {t('settings.ai.availableProviders')} ({unconfiguredProviders.length})
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {unconfiguredProviders.map((provider) => (
                <RegistryProviderCard
                  key={provider.id}
                  provider={provider}
                  onConfigureKey={() => setShowApiKeyDialog(provider.id)}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </section>

      {/* Custom Providers Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">{t('settings.ai.customProviders')}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{t('settings.ai.customProvidersDescription')}</p>
          </div>
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
        </div>

        {customProviders.length > 0 ? (
          <div className="space-y-3">
            {customProviders.map((provider) => (
              <CustomProviderCard
                key={provider.id}
                provider={provider}
                onEdit={() => {
                  setEditingCustomProvider(provider);
                  setShowCustomProviderDialog(true);
                }}
                onDelete={() => handleDeleteCustomProvider(provider.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
            {t('settings.ai.noCustomProviders')}
          </div>
        )}
      </section>

      {/* Default Settings */}
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">{t('settings.ai.defaults')}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{t('settings.ai.defaultsDescription')}</p>
        </div>
        <div className="grid gap-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="default-provider">{t('settings.ai.defaultProvider')}</Label>
            <Select
              value={config?.settings.defaultProviderId ?? ''}
              onValueChange={(value) => handleUpdateDefaults('defaultProviderId', value)}
            >
              <SelectTrigger id="default-provider">
                <SelectValue placeholder={t('settings.ai.selectProvider')} />
              </SelectTrigger>
              <SelectContent>
                {allProviders.map((p) => (
                  <SelectItem key={p.id} value={p.id} disabled={!p.hasKey} className="cursor-pointer">
                    <span className="flex items-center gap-2">
                      {p.name}
                      {!p.hasKey && <span className="text-xs text-muted-foreground">({t('settings.ai.noKey')})</span>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-model">{t('settings.ai.defaultModel')}</Label>
            <Select
              value={config?.settings.defaultModelId ?? ''}
              onValueChange={(value) => handleUpdateDefaults('defaultModelId', value)}
            >
              <SelectTrigger id="default-model">
                <SelectValue placeholder={t('settings.ai.selectModel')} />
              </SelectTrigger>
              <SelectContent>
                {allProviders
                  .find((p) => p.id === config?.settings.defaultProviderId)
                  ?.models.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="cursor-pointer">
                      {m.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-steps">{t('settings.ai.maxSteps')}</Label>
            <Input
              id="max-steps"
              type="number"
              min={1}
              max={50}
              value={config?.settings.maxSteps ?? 10}
              onChange={(e) => handleUpdateDefaults('maxSteps', Number(e.target.value))}
              className="max-w-[120px]"
            />
            <p className="text-xs text-muted-foreground">{t('settings.ai.maxStepsHelp')}</p>
          </div>
        </div>
      </section>

      {/* API Key Dialog */}
      {showApiKeyDialog && (
        <ApiKeyDialog
          providerId={showApiKeyDialog}
          providerName={registryProviders.find((p) => p.id === showApiKeyDialog)?.name ?? showApiKeyDialog}
          onSave={(apiKey) => handleSetApiKey(showApiKeyDialog, apiKey)}
          onCancel={() => setShowApiKeyDialog(null)}
        />
      )}

      {/* Custom Provider Dialog */}
      {showCustomProviderDialog && (
        <CustomProviderDialog
          provider={editingCustomProvider}
          existingIds={[...registryProviders.map((p) => p.id), ...customProviders.map((p) => p.id)]}
          onSave={handleSaveCustomProvider}
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
  onConfigureKey: () => void;
}

function RegistryProviderCard({ provider, onConfigureKey }: RegistryProviderCardProps) {
  const { t } = useTranslation('common');
  const [expanded, setExpanded] = useState(false);

  const agenticModels = provider.models.filter((m) => m.toolCall);
  const modelCount = provider.models.length;
  const agenticCount = agenticModels.length;

  return (
    <div className="border rounded-lg overflow-hidden transition-colors hover:border-border/80">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-medium">{provider.name}</h4>
              {provider.isConfigured ? (
                <Badge variant="outline" className="text-xs gap-1 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                  <CheckCircle className="h-3 w-3" />
                  {t('settings.ai.keyConfigured')}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {t('settings.ai.noKey')}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-mono">{provider.id}</span>
              <span className="mx-1.5">•</span>
              <span>{agenticCount} {t('settings.ai.agenticModels')}</span>
              {modelCount > agenticCount && (
                <span className="text-muted-foreground/60"> ({modelCount} {t('settings.ai.total')})</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant={provider.isConfigured ? 'ghost' : 'default'}
              size="sm"
              className="h-8"
              onClick={onConfigureKey}
            >
              <Key className="h-3.5 w-3.5 mr-1.5" />
              {provider.isConfigured ? t('settings.ai.updateKey') : t('settings.ai.configureKey')}
            </Button>
          </div>
        </div>

        {/* Model preview / expand toggle */}
        {agenticModels.length > 0 && (
          <div className="mt-3">
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
        <div className="border-t bg-muted/30 px-4 py-3">
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
  onEdit: () => void;
  onDelete: () => void;
}

function CustomProviderCard({ provider, onEdit, onDelete }: CustomProviderCardProps) {
  const { t } = useTranslation('common');

  return (
    <div className="border rounded-lg p-4 transition-colors hover:border-border/80">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-medium">{provider.name}</h4>
            <Badge variant="outline" className="text-xs gap-1">
              <Wrench className="h-3 w-3" />
              {t('settings.ai.custom')}
            </Badge>
            {provider.hasApiKey ? (
              <Badge variant="outline" className="text-xs gap-1 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                <CheckCircle className="h-3 w-3" />
                {t('settings.ai.keyConfigured')}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs gap-1">
                <AlertCircle className="h-3 w-3" />
                {t('settings.ai.noKey')}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-mono">{provider.id}</span>
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
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** API Key Dialog - simple dialog for setting API key */
interface ApiKeyDialogProps {
  providerId: string;
  providerName: string;
  onSave: (apiKey: string) => Promise<void>;
  onCancel: () => void;
}

function ApiKeyDialog({ providerId, providerName, onSave, onCancel }: ApiKeyDialogProps) {
  const { t } = useTranslation('common');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!apiKey.trim()) {
      setError(t('settings.ai.errors.apiKeyRequired'));
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSave(apiKey.trim());
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

        <DialogFooter>
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
      await onSave({
        id: formData.id,
        name: formData.name,
        baseURL: formData.baseURL || undefined,
        models: formData.models,
        hasApiKey: true,
        apiKey: formData.apiKey || provider?.apiKey,
      });
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

        <DialogFooter>
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
