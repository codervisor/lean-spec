import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { SessionMode } from '../types/api';

export const sessionKeys = {
  all: ['sessions'] as const,
  list: (projectId: string) => [...sessionKeys.all, 'list', projectId] as const,
  detail: (projectId: string, sessionId: string) =>
    [...sessionKeys.all, 'detail', projectId, sessionId] as const,
};

export function useSessions(projectId: string | null) {
  return useQuery({
    queryKey: sessionKeys.list(projectId ?? ''),
    queryFn: () => api.listSessions({ projectId: projectId! }),
    enabled: !!projectId,
    staleTime: 5 * 1000,
  });
}

export function useSession(projectId: string | null, sessionId: string | null) {
  return useQuery({
    queryKey: sessionKeys.detail(projectId ?? '', sessionId ?? ''),
    queryFn: () => api.getSession(sessionId!),
    enabled: !!projectId && !!sessionId,
    staleTime: 5 * 1000,
  });
}

export function useSessionMutations(projectId: string | null) {
  const queryClient = useQueryClient();
  const listKey = sessionKeys.list(projectId ?? '');

  const createSession = useMutation({
    mutationFn: (payload: { projectPath: string; specIds?: string[]; specId?: string | null; prompt?: string | null; runner?: string; mode: SessionMode }) =>
      api.createSession(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const startSession = useMutation({
    mutationFn: (sessionId: string) => api.startSession(sessionId),
    onSuccess: (session) => {
      if (projectId) {
        queryClient.setQueryData(sessionKeys.detail(projectId, session.id), session);
      }
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const stopSession = useMutation({
    mutationFn: (sessionId: string) => api.stopSession(sessionId),
    onSuccess: (session) => {
      if (projectId) {
        queryClient.setQueryData(sessionKeys.detail(projectId, session.id), session);
      }
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const pauseSession = useMutation({
    mutationFn: (sessionId: string) => api.pauseSession(sessionId),
    onSuccess: (session) => {
      if (projectId) {
        queryClient.setQueryData(sessionKeys.detail(projectId, session.id), session);
      }
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const resumeSession = useMutation({
    mutationFn: (sessionId: string) => api.resumeSession(sessionId),
    onSuccess: (session) => {
      if (projectId) {
        queryClient.setQueryData(sessionKeys.detail(projectId, session.id), session);
      }
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  return {
    createSession: createSession.mutateAsync,
    startSession: startSession.mutateAsync,
    stopSession: stopSession.mutateAsync,
    pauseSession: pauseSession.mutateAsync,
    resumeSession: resumeSession.mutateAsync,
  };
}

/**
 * Stream/poll sessions periodically.
 * @param projectId - The project ID to poll sessions for
 * @param options - Optional configuration
 * @param options.enabled - Whether polling is enabled (default: true). Set to false to disable polling.
 */
export function useSessionsStream(
  projectId: string | null,
  options?: { enabled?: boolean }
) {
  const queryClient = useQueryClient();
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!projectId || typeof window === 'undefined' || !enabled) return;

    const interval = window.setInterval(() => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.list(projectId) });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [projectId, queryClient, enabled]);
}
