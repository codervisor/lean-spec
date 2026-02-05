/**
 * TanStack Query hooks for Models Registry
 *
 * Provides query and mutation hooks for AI models registry management.
 * Benefits:
 * - Automatic caching and background refetching
 * - Built-in loading/error states
 * - Mutations for API key management and registry refresh
 * - Request deduplication
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { chatConfigKeys } from './useChatConfigQuery';

// Query keys for consistent cache management
export const modelsKeys = {
  all: ['models'] as const,
  providers: (options?: { agenticOnly?: boolean }) => [...modelsKeys.all, 'providers', options] as const,
};

/**
 * Mutation hooks for models registry
 */
export function useModelsRegistryMutations() {
  const queryClient = useQueryClient();

  // Refresh the models registry from models.dev
  const refreshRegistry = useMutation({
    mutationFn: () => api.refreshModelsRegistry(),
    onSuccess: () => {
      // Invalidate providers query to refetch
      queryClient.invalidateQueries({ queryKey: modelsKeys.all });
      // Also invalidate chat config as it may have been updated
      queryClient.invalidateQueries({ queryKey: chatConfigKeys.all });
    },
  });

  // Set API key for a provider
  const setApiKey = useMutation({
    mutationFn: ({
      providerId,
      apiKey,
      baseUrl,
    }: {
      providerId: string;
      apiKey: string;
      baseUrl?: string;
    }) => api.setProviderApiKey(providerId, apiKey, baseUrl),
    onSuccess: () => {
      // Invalidate providers query to refetch with updated isConfigured status
      queryClient.invalidateQueries({ queryKey: modelsKeys.all });
      // Also invalidate chat config
      queryClient.invalidateQueries({ queryKey: chatConfigKeys.all });
    },
  });

  // Helper to invalidate and refetch all models-related data
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: modelsKeys.all });
    queryClient.invalidateQueries({ queryKey: chatConfigKeys.all });
  };

  return {
    refreshRegistry: refreshRegistry.mutateAsync,
    setApiKey: setApiKey.mutateAsync,
    invalidateAll,
    isRefreshing: refreshRegistry.isPending,
    isSettingKey: setApiKey.isPending,
  };
}
