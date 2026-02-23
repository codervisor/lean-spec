/**
 * TanStack Query hooks for Chat Configuration
 *
 * Provides query and mutation hooks for chat config management.
 * Benefits:
 * - Automatic caching and background refetching
 * - Built-in loading/error states
 * - Optimistic updates support
 * - Request deduplication
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ChatConfig, Provider, Model } from '../types/chat-config';

// Query key factory for consistent cache management
export const chatConfigKeys = {
  all: ['chatConfig'] as const,
  config: () => [...chatConfigKeys.all, 'config'] as const,
  storage: () => [...chatConfigKeys.all, 'storage'] as const,
};

/**
 * Hook to fetch chat configuration
 */
export function useChatConfig() {
  return useQuery({
    queryKey: chatConfigKeys.config(),
    queryFn: () => api.getChatConfig(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch chat storage info
 */
export function useChatStorageInfo() {
  return useQuery({
    queryKey: chatConfigKeys.storage(),
    queryFn: () => api.getChatStorageInfo(),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Mutation hooks for chat configuration
 */
export function useChatConfigMutations() {
  const queryClient = useQueryClient();

  const updateConfig = useMutation({
    mutationFn: (config: ChatConfig) => api.updateChatConfig(config),
    onSuccess: (updatedConfig) => {
      queryClient.setQueryData(chatConfigKeys.config(), updatedConfig);
    },
    onSettled: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: chatConfigKeys.config() });
    },
  });

  // Helper mutation for updating provider
  const updateProvider = useMutation({
    mutationFn: async ({ config, provider }: { config: ChatConfig; provider: Provider }) => {
      const existingIndex = config.providers.findIndex((p) => p.id === provider.id);
      const newProviders = [...config.providers];

      if (existingIndex >= 0) {
        newProviders[existingIndex] = provider;
      } else {
        newProviders.push(provider);
      }

      return api.updateChatConfig({
        ...config,
        providers: newProviders,
      });
    },
    onSuccess: (updatedConfig) => {
      queryClient.setQueryData(chatConfigKeys.config(), updatedConfig);
    },
  });

  // Helper mutation for deleting provider
  const deleteProvider = useMutation({
    mutationFn: async ({ config, providerId }: { config: ChatConfig; providerId: string }) => {
      const newConfig = {
        ...config,
        providers: config.providers.filter((p) => p.id !== providerId),
      };

      // Update default provider if it was deleted
      if (config.settings.defaultProviderId === providerId) {
        newConfig.settings.defaultProviderId = newConfig.providers[0]?.id ?? '';
        newConfig.settings.defaultModelId = newConfig.providers[0]?.models[0]?.id ?? '';
      }

      return api.updateChatConfig(newConfig);
    },
    onSuccess: (updatedConfig) => {
      queryClient.setQueryData(chatConfigKeys.config(), updatedConfig);
    },
  });

  // Helper mutation for updating model
  const updateModel = useMutation({
    mutationFn: async ({
      config,
      providerId,
      model,
    }: {
      config: ChatConfig;
      providerId: string;
      model: Model;
    }) => {
      const newProviders = config.providers.map((p) => {
        if (p.id !== providerId) return p;

        const existingIndex = p.models.findIndex((m) => m.id === model.id);
        const newModels = [...p.models];

        if (existingIndex >= 0) {
          newModels[existingIndex] = model;
        } else {
          newModels.push(model);
        }

        return { ...p, models: newModels };
      });

      return api.updateChatConfig({
        ...config,
        providers: newProviders,
      });
    },
    onSuccess: (updatedConfig) => {
      queryClient.setQueryData(chatConfigKeys.config(), updatedConfig);
    },
  });

  // Helper mutation for deleting model
  const deleteModel = useMutation({
    mutationFn: async ({
      config,
      providerId,
      modelId,
    }: {
      config: ChatConfig;
      providerId: string;
      modelId: string;
    }) => {
      const newProviders = config.providers.map((p) => {
        if (p.id !== providerId) return p;
        return { ...p, models: p.models.filter((m) => m.id !== modelId) };
      });

      return api.updateChatConfig({
        ...config,
        providers: newProviders,
      });
    },
    onSuccess: (updatedConfig) => {
      queryClient.setQueryData(chatConfigKeys.config(), updatedConfig);
    },
  });

  // Helper mutation for updating defaults
  const updateDefaults = useMutation({
    mutationFn: async ({
      config,
      field,
      value,
    }: {
      config: ChatConfig;
      field: 'maxSteps' | 'defaultProviderId' | 'defaultModelId';
      value: string | number;
    }) => {
      const newSettings = { ...config.settings, [field]: value };

      // If changing provider, update model to first available
      if (field === 'defaultProviderId') {
        const provider = config.providers.find((p) => p.id === value);
        newSettings.defaultModelId = provider?.models[0]?.id ?? '';
      }

      return api.updateChatConfig({
        ...config,
        settings: newSettings,
      });
    },
    onSuccess: (updatedConfig) => {
      queryClient.setQueryData(chatConfigKeys.config(), updatedConfig);
    },
  });

  return {
    updateConfig: updateConfig.mutateAsync,
    updateProvider: updateProvider.mutateAsync,
    deleteProvider: deleteProvider.mutateAsync,
    updateModel: updateModel.mutateAsync,
    deleteModel: deleteModel.mutateAsync,
    updateDefaults: updateDefaults.mutateAsync,
    isUpdating:
      updateConfig.isPending ||
      updateProvider.isPending ||
      deleteProvider.isPending ||
      updateModel.isPending ||
      deleteModel.isPending ||
      updateDefaults.isPending,
  };
}
