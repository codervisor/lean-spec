import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ModelsRegistryResponse,
  ModelsRegistryProviderRaw,
  ModelsRegistryModelRaw,
  RegistryProvider,
  RegistryModel,
} from '../types/models-registry';

const API_URL = '/api/models/providers?agenticOnly=true';
const CHAT_CONFIG_URL = '/api/chat/config';

interface ChatConfigSettings {
  defaultProviderId: string;
  defaultModelId: string;
  enabledModels?: Record<string, string[]>;
}

interface ChatConfigResponse {
  settings: ChatConfigSettings;
}

interface UseModelsRegistryOptions {
  /** Include unconfigured providers in the list (default: false) */
  showUnconfigured?: boolean;
}

const toRegistryModel = (model: ModelsRegistryModelRaw): RegistryModel => {
  const inputModalities = model.modalities?.input ?? [];

  return {
    id: model.id,
    name: model.name,
    toolCall: Boolean(model.tool_call),
    reasoning: Boolean(model.reasoning),
    vision: inputModalities.includes('image'),
    contextWindow: model.limit?.context,
    maxOutput: model.limit?.output,
    inputCost: model.cost?.input,
    outputCost: model.cost?.output,
  };
};

const sortModels = (a: RegistryModel, b: RegistryModel) => {
  const score = (model: RegistryModel) =>
    (model.toolCall ? 4 : 0) + (model.reasoning ? 2 : 0) + (model.vision ? 1 : 0);

  const scoreDiff = score(b) - score(a);
  if (scoreDiff !== 0) return scoreDiff;

  const aContext = a.contextWindow ?? 0;
  const bContext = b.contextWindow ?? 0;
  if (aContext !== bContext) return bContext - aContext;

  return a.name.localeCompare(b.name);
};

const toRegistryProvider = (provider: ModelsRegistryProviderRaw): RegistryProvider => {
  const models = Object.values(provider.models ?? {})
    .map(toRegistryModel)
    .sort(sortModels);

  return {
    id: provider.id,
    name: provider.name,
    isConfigured: provider.isConfigured,
    configuredEnvVars: provider.configuredEnvVars ?? [],
    requiredEnvVars: provider.env ?? [],
    models,
  };
};

export const selectDefaultModelForProvider = (provider: RegistryProvider) =>
  provider.models.find((model) => model.toolCall) ?? provider.models[0];

export const selectDefaultModel = (providers: RegistryProvider[]) => {
  const configuredProviders = providers.filter((provider) => provider.isConfigured);
  const provider = (configuredProviders.length > 0 ? configuredProviders : providers)[0];
  if (!provider) return null;

  const model = selectDefaultModelForProvider(provider);
  if (!model) return null;

  return { providerId: provider.id, modelId: model.id };
};

export const useModelsRegistry = (options: UseModelsRegistryOptions = {}) => {
  const { showUnconfigured = false } = options;
  const [allProviders, setAllProviders] = useState<RegistryProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    total: 0,
    configuredCount: 0,
    configuredProviderIds: [] as string[],
  });
  const [savedDefaults, setSavedDefaults] = useState<{ providerId: string; modelId: string } | null>(null);
  const [enabledModels, setEnabledModels] = useState<Record<string, string[]> | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);

        // Fetch both providers and chat config in parallel
        const [providersRes, configRes] = await Promise.all([
          fetch(API_URL, { signal: controller.signal }),
          fetch(CHAT_CONFIG_URL, { signal: controller.signal }),
        ]);

        if (!providersRes.ok) {
          throw new Error('Failed to load models');
        }
        const data: ModelsRegistryResponse = await providersRes.json();
        if (cancelled) return;

        const mapped = data.providers.map(toRegistryProvider);
        setAllProviders(mapped);
        setSummary({
          total: data.total,
          configuredCount: data.configuredCount,
          configuredProviderIds: data.configuredProviderIds ?? [],
        });

        // Parse saved defaults and enabled models from chat config
        if (configRes.ok) {
          const configData: ChatConfigResponse = await configRes.json();
          if (configData.settings?.defaultProviderId && configData.settings?.defaultModelId) {
            setSavedDefaults({
              providerId: configData.settings.defaultProviderId,
              modelId: configData.settings.defaultModelId,
            });
          }
          if (configData.settings?.enabledModels) {
            setEnabledModels(configData.settings.enabledModels);
          }
        }

        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load models');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reloadTrigger]);

  const reload = useCallback(() => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  // Filter providers based on showUnconfigured option and enabled models
  const providers = useMemo(() => {
    let filteredProviders = showUnconfigured ? allProviders : allProviders.filter((p) => p.isConfigured);
    
    // Apply enabled models filter if specified
    if (enabledModels) {
      filteredProviders = filteredProviders.map(provider => {
        const enabledModelIds = enabledModels[provider.id];
        if (enabledModelIds && enabledModelIds.length > 0) {
          // Filter models to only include enabled ones
          return {
            ...provider,
            models: provider.models.filter(model => enabledModelIds.includes(model.id))
          };
        }
        // If no enabled models specified for this provider, include all models
        return provider;
      }).filter(provider => provider.models.length > 0); // Remove providers with no models
    }
    
    return filteredProviders;
  }, [allProviders, showUnconfigured, enabledModels]);

  // Use saved defaults if available and valid, otherwise compute from providers
  const defaultSelection = useMemo(() => {
    if (savedDefaults) {
      // Validate that the saved defaults are still valid (provider exists and is configured)
      const provider = providers.find((p) => p.id === savedDefaults.providerId);
      if (provider?.isConfigured) {
        const model = provider.models.find((m) => m.id === savedDefaults.modelId);
        if (model) {
          return savedDefaults;
        }
        // Model not found, try to find a tool-enabled model from the same provider
        const fallbackModel = selectDefaultModelForProvider(provider);
        if (fallbackModel) {
          return { providerId: provider.id, modelId: fallbackModel.id };
        }
      }
    }
    // Fall back to computed default from filtered providers
    return selectDefaultModel(providers);
  }, [providers, savedDefaults]);

  return {
    providers,
    allProviders,
    loading,
    error,
    summary,
    defaultSelection,
    savedDefaults,
    reload,
  };
};
