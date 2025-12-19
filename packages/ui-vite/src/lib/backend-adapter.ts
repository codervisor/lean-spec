// Backend adapter pattern for web (HTTP) vs desktop (Tauri IPC)
// This allows the same UI code to work in both browser and Tauri contexts

import type {
  Spec,
  SpecDetail,
  Stats,
  DependencyGraph,
  Project,
  ProjectsResponse,
  ProjectsListResponse,
} from './api';
import { normalizeProjectsResponse } from './api';

export interface ListParams {
  status?: string;
  priority?: string;
  tag?: string;
  search?: string;
}

/**
 * Backend adapter interface - abstracts the communication layer
 * Web uses HTTP fetch, Desktop uses Tauri invoke
 */
export interface BackendAdapter {
  // Project operations
  getProjects(): Promise<ProjectsResponse>;
  switchProject(projectId: string): Promise<void>;
  
  // Spec operations
  getSpecs(params?: ListParams): Promise<Spec[]>;
  getSpec(name: string): Promise<SpecDetail>;
  updateSpec(name: string, updates: Partial<Spec>): Promise<void>;
  
  // Stats and dependencies
  getStats(): Promise<Stats>;
  getDependencies(specName?: string): Promise<DependencyGraph>;
}

/**
 * HTTP adapter for web browser - connects to Rust HTTP server
 */
export class HttpBackendAdapter implements BackendAdapter {
  private baseUrl: string;

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
    return normalizeProjectsResponse(data);
  }

  async switchProject(projectId: string): Promise<void> {
    await this.fetchAPI(`/api/projects/${encodeURIComponent(projectId)}/switch`, {
      method: 'POST',
    });
  }

  async getSpecs(params?: ListParams): Promise<Spec[]> {
    const query = params ? new URLSearchParams(params as Record<string, string>) : '';
    const endpoint = query ? `/api/specs?${query}` : '/api/specs';
    const data = await this.fetchAPI<{ specs: Spec[] }>(endpoint);
    return data.specs;
  }

  async getSpec(name: string): Promise<SpecDetail> {
    const data = await this.fetchAPI<{ spec: SpecDetail }>(`/api/specs/${encodeURIComponent(name)}`);
    return data.spec;
  }

  async updateSpec(name: string, updates: Partial<Spec>): Promise<void> {
    await this.fetchAPI(`/api/specs/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async getStats(): Promise<Stats> {
    const data = await this.fetchAPI<{ stats: Stats }>('/api/stats');
    return data.stats;
  }

  async getDependencies(specName?: string): Promise<DependencyGraph> {
    const endpoint = specName
      ? `/api/specs/${encodeURIComponent(specName)}/dependencies`
      : '/api/dependencies';
    const data = await this.fetchAPI<{ graph: DependencyGraph }>(endpoint);
    return data.graph;
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

  async switchProject(projectId: string): Promise<void> {
    await this.invoke('desktop_switch_project', { projectId });
    this.currentProjectId = projectId;
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

  async getSpec(name: string): Promise<SpecDetail> {
    if (!this.currentProjectId) {
      throw new Error('No project selected');
    }
    return this.invoke<SpecDetail>('get_spec_detail', {
      projectId: this.currentProjectId,
      specId: name,
    });
  }

  async updateSpec(name: string, updates: Partial<Spec>): Promise<void> {
    if (!this.currentProjectId) {
      throw new Error('No project selected');
    }
    // For now, only status update is supported
    if (updates.status) {
      await this.invoke('update_spec_status', {
        projectId: this.currentProjectId,
        specId: name,
        newStatus: updates.status,
      });
    }
  }

  async getStats(): Promise<Stats> {
    if (!this.currentProjectId) {
      throw new Error('No project selected');
    }
    return this.invoke<Stats>('get_project_stats', {
      projectId: this.currentProjectId,
    });
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
