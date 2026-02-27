import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { projectKeys, useCurrentProject, useProjectMutations, useProjects } from './useProjectQuery';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    getProjects: vi.fn(),
    setCurrentProjectId: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    validateProject: vi.fn(),
  },
}));

vi.mock('../stores/machine', () => ({
  useMachineStore: () => ({
    machineModeEnabled: false,
    currentMachine: null,
  }),
}));

const mockedApi = api as unknown as {
  getProjects: ReturnType<typeof vi.fn>;
  setCurrentProjectId: ReturnType<typeof vi.fn>;
  createProject: ReturnType<typeof vi.fn>;
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

describe('useProjectQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    mockedApi.getProjects.mockResolvedValue({
      projects: [
        { id: 'p1', name: 'One', favorite: false },
        { id: 'p2', name: 'Two', favorite: true },
      ],
    });
    mockedApi.createProject.mockResolvedValue({ id: 'p1', name: 'One' });
  });

  it('returns projects and favorites', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.projects).toHaveLength(2);
    expect(result.current.favoriteProjects).toHaveLength(1);
  });

  it('derives current project from sessionStorage', async () => {
    sessionStorage.setItem('leanspec-current-project', 'p2');
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useCurrentProject(), { wrapper });

    await waitFor(() => expect(result.current.currentProject?.id).toBe('p2'));

    expect(mockedApi.setCurrentProjectId).toHaveBeenCalledWith('p2');
  });

  it('switches project and invalidates cache', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useProjectMutations(), { wrapper });

    await act(async () => {
      await result.current.switchProject('p1');
    });

    expect(mockedApi.setCurrentProjectId).toHaveBeenCalledWith('p1');
    expect(sessionStorage.getItem('leanspec-current-project')).toBe('p1');
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: projectKeys.list('leanspec-current-project'),
    });
  });
});
