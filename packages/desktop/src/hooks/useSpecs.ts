/**
 * React hook for managing specs via native Tauri API
 * 
 * This hook provides a React-friendly interface to the Rust spec operations,
 * eliminating the need for the Next.js server and iframe communication.
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  Spec,
  LightweightSpec,
  StatsResult,
  DependencyGraph,
  SpecDependencies,
  ValidationResult,
} from '../types';
import {
  getSpecs,
  getSpecDetail,
  getProjectStats,
  getDependencyGraph,
  getSpecDependencies,
  searchSpecs,
  getSpecsByStatus,
  getAllTags,
  validateSpec,
  validateAllSpecs,
  updateSpecStatus,
} from '../lib/ipc';

export interface UseSpecsOptions {
  /** Project ID to load specs for */
  projectId: string | undefined;
  /** Auto-load specs when projectId changes */
  autoLoad?: boolean;
}

export interface UseSpecsReturn {
  // Data
  specs: LightweightSpec[];
  loading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  search: (query: string) => Promise<LightweightSpec[]>;
  filterByStatus: (status: string) => Promise<LightweightSpec[]>;
}

/**
 * Hook for managing the specs list
 */
export function useSpecs({ projectId, autoLoad = true }: UseSpecsOptions): UseSpecsReturn {
  const [specs, setSpecs] = useState<LightweightSpec[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setSpecs([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getSpecs(projectId);
      setSpecs(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const search = useCallback(async (query: string): Promise<LightweightSpec[]> => {
    if (!projectId) return [];
    return searchSpecs(projectId, query);
  }, [projectId]);

  const filterByStatus = useCallback(async (status: string): Promise<LightweightSpec[]> => {
    if (!projectId) return [];
    return getSpecsByStatus(projectId, status);
  }, [projectId]);

  useEffect(() => {
    if (autoLoad && projectId) {
      refresh();
    }
  }, [autoLoad, projectId, refresh]);

  return {
    specs,
    loading,
    error,
    refresh,
    search,
    filterByStatus,
  };
}

export interface UseSpecDetailOptions {
  projectId: string | undefined;
  specId: string | undefined;
  autoLoad?: boolean;
}

export interface UseSpecDetailReturn {
  spec: Spec | null;
  dependencies: SpecDependencies | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateStatus: (newStatus: string) => Promise<void>;
}

/**
 * Hook for managing a single spec's detail view
 */
export function useSpecDetail({ projectId, specId, autoLoad = true }: UseSpecDetailOptions): UseSpecDetailReturn {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [dependencies, setDependencies] = useState<SpecDependencies | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId || !specId) {
      setSpec(null);
      setDependencies(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [specResult, depsResult] = await Promise.all([
        getSpecDetail(projectId, specId),
        getSpecDependencies(projectId, specId),
      ]);
      setSpec(specResult);
      setDependencies(depsResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [projectId, specId]);

  const updateStatus = useCallback(async (newStatus: string) => {
    if (!projectId || !specId) return;
    
    setLoading(true);
    setError(null);
    try {
      const updatedSpec = await updateSpecStatus(projectId, specId, newStatus);
      setSpec(updatedSpec);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [projectId, specId]);

  useEffect(() => {
    if (autoLoad && projectId && specId) {
      refresh();
    }
  }, [autoLoad, projectId, specId, refresh]);

  return {
    spec,
    dependencies,
    loading,
    error,
    refresh,
    updateStatus,
  };
}

export interface UseProjectStatsOptions {
  projectId: string | undefined;
  autoLoad?: boolean;
}

export interface UseProjectStatsReturn {
  stats: StatsResult | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for project statistics
 */
export function useProjectStats({ projectId, autoLoad = true }: UseProjectStatsOptions): UseProjectStatsReturn {
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setStats(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getProjectStats(projectId);
      setStats(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (autoLoad && projectId) {
      refresh();
    }
  }, [autoLoad, projectId, refresh]);

  return {
    stats,
    loading,
    error,
    refresh,
  };
}

export interface UseDependencyGraphOptions {
  projectId: string | undefined;
  autoLoad?: boolean;
}

export interface UseDependencyGraphReturn {
  graph: DependencyGraph | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for dependency graph visualization
 */
export function useDependencyGraph({ projectId, autoLoad = true }: UseDependencyGraphOptions): UseDependencyGraphReturn {
  const [graph, setGraph] = useState<DependencyGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setGraph(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getDependencyGraph(projectId);
      setGraph(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (autoLoad && projectId) {
      refresh();
    }
  }, [autoLoad, projectId, refresh]);

  return {
    graph,
    loading,
    error,
    refresh,
  };
}

export interface UseTagsOptions {
  projectId: string | undefined;
  autoLoad?: boolean;
}

export interface UseTagsReturn {
  tags: string[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing tags
 */
export function useTags({ projectId, autoLoad = true }: UseTagsOptions): UseTagsReturn {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setTags([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getAllTags(projectId);
      setTags(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (autoLoad && projectId) {
      refresh();
    }
  }, [autoLoad, projectId, refresh]);

  return {
    tags,
    loading,
    error,
    refresh,
  };
}

export interface UseValidationOptions {
  projectId: string | undefined;
}

export interface UseValidationReturn {
  results: ValidationResult[];
  loading: boolean;
  error: string | null;
  validateAll: () => Promise<ValidationResult[]>;
  validateOne: (specId: string) => Promise<ValidationResult>;
}

/**
 * Hook for spec validation
 */
export function useValidation({ projectId }: UseValidationOptions): UseValidationReturn {
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAll = useCallback(async (): Promise<ValidationResult[]> => {
    if (!projectId) return [];

    setLoading(true);
    setError(null);
    try {
      const result = await validateAllSpecs(projectId);
      setResults(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const validateOne = useCallback(async (specId: string): Promise<ValidationResult> => {
    if (!projectId) throw new Error('No project selected');

    setLoading(true);
    setError(null);
    try {
      const result = await validateSpec(projectId, specId);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return {
    results,
    loading,
    error,
    validateAll,
    validateOne,
  };
}
