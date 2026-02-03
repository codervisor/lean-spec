import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { sessionKeys, useSession, useSessionMutations, useSessions } from './useSessionsQuery';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    listSessions: vi.fn(),
    getSession: vi.fn(),
    createSession: vi.fn(),
    startSession: vi.fn(),
    stopSession: vi.fn(),
    pauseSession: vi.fn(),
    resumeSession: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  listSessions: ReturnType<typeof vi.fn>;
  getSession: ReturnType<typeof vi.fn>;
  startSession: ReturnType<typeof vi.fn>;
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useSessionsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.listSessions.mockResolvedValue([]);
    mockedApi.getSession.mockResolvedValue({ id: 'session-1' });
    mockedApi.startSession.mockResolvedValue({ id: 'session-1' });
  });

  it('fetches sessions list', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSessions('project-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedApi.listSessions).toHaveBeenCalled();
  });

  it('fetches session detail', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSession('project-1', 'session-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedApi.getSession).toHaveBeenCalledWith('session-1');
  });

  it('starts session and invalidates list cache', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSessionMutations('project-1'), { wrapper });

    await act(async () => {
      await result.current.startSession('session-1');
    });

    expect(mockedApi.startSession).toHaveBeenCalledWith('session-1');
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: sessionKeys.list('project-1'),
    });
  });
});
