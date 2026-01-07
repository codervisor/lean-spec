// Backend adapter pattern for web (HTTP) vs desktop (Tauri IPC)
// This allows the same UI code to work in both browser and Tauri contexts

import type {
  DependencyGraph,
  ListParams,
  Spec,
  SpecDetail,
  Stats,
  Project,
  ProjectStatsResponse,
  ProjectsListResponse,
  ProjectsResponse,
  ListSpecsResponse,
} from '../types/api';
import { normalizeProjectsResponse } from './api';

/**
 * Backend adapter interface - abstracts the communication layer
 * Web uses HTTP fetch, Desktop uses Tauri invoke
 */
export interface BackendAdapter {
  // Project operations
  getProjects(): Promise<ProjectsResponse>;

  // Spec operations
  getSpecs(params?: ListParams): Promise<Spec[]>;
  getSpec(specName: string): Promise<SpecDetail>;
  updateSpec(specName: string, updates: Partial<Pick<Spec, 'status' | 'priority' | 'tags'>>): Promise<void>;

  // Stats and dependencies
  getStats(): Promise<Stats>;
  getProjectStats?(projectId: string): Promise<Stats>;
  getDependencies(specName?: string): Promise<DependencyGraph>;
}

/**
 * HTTP adapter for web browser - connects to Rust HTTP server
 */
export class HttpBackendAdapter implements BackendAdapter {
  private baseUrl: string;
  private currentProjectId: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || import.meta.env.VITE_API_URL || 'http://localhost:3333';
  }

  private async fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || response.statusText);
    }

    return response.json();
  }

  async getProjects(): Promise<ProjectsResponse> {
    const data = await this.fetchAPI<ProjectsResponse | ProjectsListResponse>('/api/projects');
    const normalized = normalizeProjectsResponse(data);
    this.currentProjectId = normalized.current?.id || null;
    return normalized;
  }

  async getSpecs(params?: ListParams): Promise<Spec[]> {
    if (!this.currentProjectId) {
      throw new Error('No project selected');
    }
    const query = params
      ? new URLSearchParams(
        Object.entries(params).reduce<string[][]>((acc, [key, value]) => {
          if (typeof value === 'string' && value.length > 0) acc.push([key, value]);
          return acc;
        }, [])
      ).toString()
      : '';
    const endpoint = query
      ? `/api/projects/${encodeURIComponent(this.currentProjectId)}/specs?${query}`
      : `/api/projects/${encodeURIComponent(this.currentProjectId)}/specs`;
    const data = await this.fetchAPI<ListSpecsResponse>(endpoint);
    return data.specs || [];
  }

  async getSpec(specName: string): Promise<SpecDetail> {
    if (!this.currentProjectId) {
      throw new Error('No project selected');
    }
    const data = await this.fetchAPI<SpecDetail | { spec: SpecDetail }>(
      `/api/projects/${encodeURIComponent(this.currentProjectId)}/specs/${encodeURIComponent(specName)}`
    );
    return 'spec' in data ? data.spec : data;
  }

  async updateSpec(
    specName: string,
    updates: Partial<Pick<Spec, 'status' | 'priority' | 'tags'>>
  ): Promise<void> {
    if (!this.currentProjectId) {
      throw new Error('No project selected');
    }
    // Note: Currently using legacy /api/specs/{spec}/metadata endpoint
    // which implicitly uses the current project from server state.
    // TODO: Consider migrating to /api/projects/{id}/specs/{spec}/metadata for consistency
    await this.fetchAPI(`/api/specs/${encodeURIComponent(specName)}/metadata`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async getStats(): Promise<Stats> {
    if (!this.currentProjectId) {
      throw new Error('No project selected');
    }
    const data = await this.fetchAPI<Stats | { stats: Stats }>(
      `/api/projects/${encodeURIComponent(this.currentProjectId)}/stats`
    );
    return 'stats' in data ? data.stats : data;
  }

  async getProjectStats(projectId: string): Promise<Stats> {
    const data = await this.fetchAPI<ProjectStatsResponse | Stats>(
      `/api/projects/${encodeURIComponent(projectId)}/stats`
    );
    const statsPayload = 'stats' in data ? data.stats : data;
    return statsPayload;
  }

  async getDependencies(_specName?: string): Promise<DependencyGraph> {
    if (!this.currentProjectId) {
      throw new Error('No project selected');
    }
    // Note: specName parameter is ignored for HTTP adapter as the project endpoint
    // returns the full dependency graph. Individual spec dependencies can be computed client-side.
    const data = await this.fetchAPI<DependencyGraph>(
      `/api/projects/${encodeURIComponent(this.currentProjectId)}/dependencies`
    );
    return data;
  }
}

/**
 * Tauri adapter for desktop app - uses IPC commands
 */
export class TauriBackendAdapter implements BackendAdapter {
  private currentProjectId: string | null = null;

  private async invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    // Dynamic import to avoid bundling Tauri in web builds
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(command, args);
  }

  async getProjects(): Promise<ProjectsResponse> {
    const data = await this.invoke<{
      current_project: Project | null;
      projects: Project[];
    }>('desktop_bootstrap');

    this.currentProjectId = data.current_project?.id || null;

    return {
      current: data.current_project,
      available: data.projects,
    };
  }

  async getSpecs(_params?: ListParams): Promise<Spec[]> {
    if (!this.currentProjectId) {
      throw new Error('No project selected');
    }
    // Tauri commands return LightweightSpec[], need to map to Spec[]
    const specs = await this.invoke<Spec[]>('get_specs', {
      projectId: this.currentProjectId
    });
    return specs;
  }

  async getSpec(specName: string): Promise<SpecDetail> {
    if (!this.currentProjectId) {
      throw new Error('No project selected');
    }
    const spec = await this.invoke<SpecDetail>('get_spec_detail', {
      projectId: this.currentProjectId,
      specId: specName,
    });
    return spec;
  }

  async updateSpec(
    specName: string,
    updates: Partial<Pick<Spec, 'status' | 'priority' | 'tags'>>
  ): Promise<void> {
    if (!this.currentProjectId) {
      throw new Error('No project selected');
    }
    // For now, only status update is supported
    if (updates.status) {
      await this.invoke('update_spec_status', {
        projectId: this.currentProjectId,
        specId: specName,
        newStatus: updates.status,
      });
    }
  }

  async getStats(): Promise<Stats> {
    if (!this.currentProjectId) {
      throw new Error('No project selected');
    }
    const stats = await this.invoke<Stats>('get_project_stats', {
      projectId: this.currentProjectId,
    });
    return stats;
  }

  async getDependencies(_specName?: string): Promise<DependencyGraph> {
    if (!this.currentProjectId) {
      throw new Error('No project selected');
    }
    return this.invoke<DependencyGraph>('get_dependency_graph', {
      projectId: this.currentProjectId,
    });
  }
}

/**
 * Detect environment and create appropriate backend adapter
 */
export function createBackendAdapter(): BackendAdapter {
  // Check if running in Tauri
  // @ts-expect-error __TAURI__ is injected by Tauri at runtime
  if (typeof window !== 'undefined' && window.__TAURI__) {
    return new TauriBackendAdapter();
  }
  return new HttpBackendAdapter();
}

// Export singleton instance
let backendInstance: BackendAdapter | null = null;

export function getBackend(): BackendAdapter {
  if (!backendInstance) {
    backendInstance = createBackendAdapter();
  }
  return backendInstance;
}
