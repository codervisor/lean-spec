import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

// Query keys for React Query
const QUERY_KEYS = {
  providers: ['models', 'providers'] as const,
  chatConfig: ['chat', 'config'] as const,
};

// Fetch functions for React Query
const fetchProviders = async (): Promise<{
  providers: RegistryProvider[];
  summary: { total: number; configuredCount: number; configuredProviderIds: string[] };
}> => {
  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error('Failed to load models');
  }
  const data: ModelsRegistryResponse = await res.json();
  return {
    providers: data.providers.map(toRegistryProvider),
    summary: {
      total: data.total,
      configuredCount: data.configuredCount,
      configuredProviderIds: data.configuredProviderIds ?? [],
    },
  };
};

const fetchChatConfig = async (): Promise<{
  savedDefaults: { providerId: string; modelId: string } | null;
  enabledModels: Record<string, string[]> | null;
}> => {
  const res = await fetch(CHAT_CONFIG_URL);
  if (!res.ok) {
    return { savedDefaults: null, enabledModels: null };
  }
  const data: ChatConfigResponse = await res.json();
  return {
    savedDefaults:
      data.settings?.defaultProviderId && data.settings?.defaultModelId
        ? { providerId: data.settings.defaultProviderId, modelId: data.settings.defaultModelId }
        : null,
    enabledModels: data.settings?.enabledModels ?? null,
  };
};

export const useModelsRegistry = (options: UseModelsRegistryOptions = {}) => {
  const { showUnconfigured = false } = options;
  const queryClient = useQueryClient();

  // Fetch providers
  const providersQuery = useQuery({
    queryKey: QUERY_KEYS.providers,
    queryFn: fetchProviders,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch chat config
  const configQuery = useQuery({
    queryKey: QUERY_KEYS.chatConfig,
    queryFn: fetchChatConfig,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const allProviders = useMemo(
    () => providersQuery.data?.providers ?? [],
    [providersQuery.data?.providers]
  );
  const summary = useMemo(
    () => providersQuery.data?.summary ?? { total: 0, configuredCount: 0, configuredProviderIds: [] },
    [providersQuery.data?.summary]
  );
  const savedDefaults = configQuery.data?.savedDefaults ?? null;
  const enabledModels = configQuery.data?.enabledModels ?? null;

  const loading = providersQuery.isLoading || configQuery.isLoading;
  const error = providersQuery.error?.message ?? configQuery.error?.message ?? null;

  const reload = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.providers });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chatConfig });
  };

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
        // Model not found (possibly filtered out by enabledModels), try to find a tool-enabled model from the same provider
        console.warn(
          `Saved default model "${savedDefaults.modelId}" not available for provider "${savedDefaults.providerId}". ` +
          `It may have been filtered out by enabledModels configuration. Falling back to default model.`
        );
        const fallbackModel = selectDefaultModelForProvider(provider);
        if (fallbackModel) {
          return { providerId: provider.id, modelId: fallbackModel.id };
        }
      } else if (savedDefaults.providerId) {
        // Provider exists but not configured, or provider not found
        console.warn(
          `Saved provider "${savedDefaults.providerId}" is not configured or not available. ` +
          `Falling back to default provider.`
        );
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
