import { useEffect, useMemo, useState } from 'react';
import type {
  ModelsRegistryResponse,
  ModelsRegistryProviderRaw,
  ModelsRegistryModelRaw,
  RegistryProvider,
  RegistryModel,
} from '../types/models-registry';

const API_URL = '/api/models/providers?agenticOnly=true';

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

export const useModelsRegistry = () => {
  const [providers, setProviders] = useState<RegistryProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    total: 0,
    configuredCount: 0,
    configuredProviderIds: [] as string[],
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(API_URL, { signal: controller.signal });
        if (!res.ok) {
          throw new Error('Failed to load models');
        }
        const data: ModelsRegistryResponse = await res.json();
        if (cancelled) return;

        const mapped = data.providers.map(toRegistryProvider);
        setProviders(mapped);
        setSummary({
          total: data.total,
          configuredCount: data.configuredCount,
          configuredProviderIds: data.configuredProviderIds ?? [],
        });
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
  }, []);

  const defaultSelection = useMemo(() => selectDefaultModel(providers), [providers]);

  return {
    providers,
    loading,
    error,
    summary,
    defaultSelection,
  };
};
