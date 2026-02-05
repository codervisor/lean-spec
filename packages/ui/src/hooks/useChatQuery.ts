import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChatThread } from '../lib/chat-api';
import { ChatApi } from '../lib/chat-api';
import type { UIMessage } from '@ai-sdk/react';

export const chatKeys = {
  all: ['chat'] as const,
  threads: (projectId: string) => [...chatKeys.all, 'threads', projectId] as const,
  messages: (threadId: string) => [...chatKeys.all, 'messages', threadId] as const,
};

export function useChatThreads(projectId: string | null) {
  return useQuery({
    queryKey: chatKeys.threads(projectId ?? ''),
    queryFn: () => ChatApi.getThreads(projectId ?? ''),
    enabled: !!projectId,
    staleTime: 5 * 1000,
  });
}

export function useChatMessages(threadId: string | null | undefined) {
  return useQuery({
    queryKey: chatKeys.messages(threadId ?? ''),
    queryFn: () => ChatApi.getMessages(threadId ?? ''),
    enabled: !!threadId,
    staleTime: 5 * 1000,
  });
}

export function useChatThreadMutations(projectId: string | null) {
  const queryClient = useQueryClient();
  const threadsKey = chatKeys.threads(projectId ?? '');

  const createThread = useMutation({
    mutationFn: (payload: {
      model: { providerId: string; modelId: string };
      initialMessages?: UIMessage[];
    }) => {
      if (!projectId) throw new Error('Missing project id');
      return ChatApi.createThread(projectId, payload.model, payload.initialMessages ?? []);
    },
    onSuccess: (thread) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: threadsKey });
        queryClient.setQueryData<ChatThread[]>(threadsKey, (prev = []) => {
          const exists = prev.some((t) => t.id === thread.id);
          return exists ? prev : [thread, ...prev];
        });
      }
    },
  });

  const updateThread = useMutation({
    mutationFn: (payload: { id: string; updates: Partial<ChatThread> }) =>
      ChatApi.updateThread(payload.id, payload.updates),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: threadsKey });
      }
    },
  });

  const deleteThread = useMutation({
    mutationFn: (id: string) => ChatApi.deleteThread(id),
    onSuccess: (_result, id) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: threadsKey });
        queryClient.setQueryData<ChatThread[]>(threadsKey, (prev = []) =>
          prev.filter((thread) => thread.id !== id)
        );
      }
    },
  });

  return {
    createThread: createThread.mutateAsync,
    updateThread: updateThread.mutateAsync,
    deleteThread: deleteThread.mutateAsync,
  };
}
