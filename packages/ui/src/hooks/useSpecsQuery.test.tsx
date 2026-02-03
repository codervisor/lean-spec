import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  specKeys,
  useInvalidateSpecs,
  useProjectStats,
  useSpecDetail,
  useSpecsList,
} from './useSpecsQuery';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    setCurrentProjectId: vi.fn(),
    getSpecs: vi.fn(),
    getSpecsWithHierarchy: vi.fn(),
    getSpec: vi.fn(),
    getStats: vi.fn(),
    getDependencies: vi.fn(),
    updateSpec: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  setCurrentProjectId: ReturnType<typeof vi.fn>;
  getSpecs: ReturnType<typeof vi.fn>;
  getSpec: ReturnType<typeof vi.fn>;
  getStats: ReturnType<typeof vi.fn>;
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

describe('useSpecsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getSpecs.mockResolvedValue([]);
    mockedApi.getSpec.mockResolvedValue({ specName: 'spec-1' });
    mockedApi.getStats.mockResolvedValue({});
  });

  it('fetches specs list and sets project id', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSpecsList('project-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedApi.setCurrentProjectId).toHaveBeenCalledWith('project-1');
    expect(mockedApi.getSpecs).toHaveBeenCalledWith(undefined);
  });

  it('fetches spec detail', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useSpecDetail('project-1', 'spec-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedApi.getSpec).toHaveBeenCalledWith('spec-1');
  });

  it('fetches project stats', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useProjectStats('project-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedApi.getStats).toHaveBeenCalled();
  });

  it('invalidates specs queries', () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useInvalidateSpecs(), { wrapper });

    result.current();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: specKeys.all });
  });
});
