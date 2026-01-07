// Backend adapter pattern for web (HTTP) vs desktop (Tauri IPC)
// This allows the same UI code to work in both browser and Tauri contexts

import type {
  ContextFileContent,
  ContextFileListItem,
  DependencyGraph,
  DirectoryListResponse,
  ListParams,
  Spec,
  SpecDetail,
  Stats,
  Project,
  ProjectMutationResponse,
  ProjectStatsResponse,
  ProjectValidationResponse,
  ProjectsResponse,
  ListSpecsResponse,
  SearchResponse as SearchResult,
} from '../types/api';

export class APIError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'APIError';
  }
}

/**
 * Backend adapter interface - abstracts the communication layer
 * Web uses HTTP fetch, Desktop uses Tauri invoke
 */
export interface BackendAdapter {
  // Project operations
  getProjects(): Promise<ProjectsResponse>;
  switchProject(projectId: string): Promise<void>;
  createProject(
    path: string,
    options?: { favorite?: boolean; color?: string; name?: string; description?: string | null }
  ): Promise<Project>;
  updateProject(
    projectId: string,
    updates: Partial<Pick<Project, 'name' | 'color' | 'favorite' | 'description'>>
  ): Promise<Project | undefined>;
  deleteProject(projectId: string): Promise<void>;
  validateProject(projectId: string): Promise<ProjectValidationResponse>;

  // Spec operations
  getSpecs(params?: ListParams): Promise<Spec[]>;
  getSpec(specName: string): Promise<SpecDetail>;
  updateSpec(specName: string, updates: Partial<Pick<Spec, 'status' | 'priority' | 'tags'>>): Promise<void>;

  // Stats and dependencies
  getStats(): Promise<Stats>;
  getProjectStats?(projectId: string): Promise<Stats>;
  getDependencies(specName?: string): Promise<DependencyGraph>;

  // Context files & local filesystem
  getContextFiles(): Promise<ContextFileListItem[]>;
  getContextFile(path: string): Promise<ContextFileContent>;
  listDirectory(path?: string): Promise<DirectoryListResponse>;
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
      const raw = await response.text();
      let message = raw || response.statusText;

      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.message === 'string') {
          message = parsed.message;
        } else if (typeof parsed.error === 'string') {
          message = parsed.error;
        } else if (typeof parsed.detail === 'string') {
          message = parsed.detail;
        }
      } catch {
        // Fall back to raw message
      }

      throw new APIError(response.status, message || response.statusText);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch (err) {
      throw new APIError(response.status, err instanceof Error ? err.message : 'Failed to parse response');
    }
  }

  async getProjects(): Promise<ProjectsResponse> {
    const data = await this.fetchAPI<ProjectsResponse>('/api/projects');
    return data;
  }

  async switchProject(projectId: string): Promise<void> {
    await this.fetchAPI(`/api/projects/${encodeURIComponent(projectId)}/switch`, {
      method: 'POST',
    });
  }

  async createProject(
    path: string,
    options?: { favorite?: boolean; color?: string; name?: string; description?: string | null }
  ): Promise<Project> {
    const data = await this.fetchAPI<ProjectMutationResponse>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ path, ...options }),
    });
    if (!data.project) {
      throw new Error('Project creation failed: missing project payload');
    }
    return data.project;
  }

  async updateProject(
    projectId: string,
    updates: Partial<Pick<Project, 'name' | 'color' | 'favorite' | 'description'>>
  ): Promise<Project | undefined> {
    const data = await this.fetchAPI<ProjectMutationResponse>(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return data.project;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.fetchAPI(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
    });
  }

  async validateProject(projectId: string): Promise<ProjectValidationResponse> {
    return this.fetchAPI<ProjectValidationResponse>(`/api/projects/${encodeURIComponent(projectId)}/validate`, {
      method: 'POST',
    });
  }

  async getSpecs(params?: ListParams): Promise<Spec[]> {
    const query = params
      ? new URLSearchParams(
        Object.entries(params).reduce<string[][]>((acc, [key, value]) => {
          if (typeof value === 'string' && value.length > 0) acc.push([key, value]);
          return acc;
        }, [])
      ).toString()
      : '';
    const endpoint = query ? `/api/specs?${query}` : '/api/specs';
    const data = await this.fetchAPI<ListSpecsResponse>(endpoint);
    return data.specs || [];
  }

  async getSpec(specName: string): Promise<SpecDetail> {
    const data = await this.fetchAPI<SpecDetail | { spec: SpecDetail }>(`/api/specs/${encodeURIComponent(specName)}`);
    return 'spec' in data ? data.spec : data;
  }

  async updateSpec(
    specName: string,
    updates: Partial<Pick<Spec, 'status' | 'priority' | 'tags'>>
  ): Promise<void> {
    await this.fetchAPI(`/api/specs/${encodeURIComponent(specName)}/metadata`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async getStats(): Promise<Stats> {
    const data = await this.fetchAPI<Stats | { stats: Stats }>('/api/stats');
    return 'stats' in data ? data.stats : data;
  }

  async getProjectStats(projectId: string): Promise<Stats> {
    const data = await this.fetchAPI<ProjectStatsResponse | Stats>(
      `/api/projects/${encodeURIComponent(projectId)}/stats`
    );
    const statsPayload = 'stats' in data ? data.stats : data;
    return statsPayload;
  }

  async getDependencies(specName?: string): Promise<DependencyGraph> {
    const endpoint = specName
      ? `/api/deps/${encodeURIComponent(specName)}`
      : '/api/deps';
    const data = await this.fetchAPI<{ graph: DependencyGraph } | DependencyGraph>(endpoint);
    return 'graph' in data ? data.graph : data;
  }

  async getContextFiles(): Promise<ContextFileListItem[]> {
    const data = await this.fetchAPI<{ files?: ContextFileListItem[] }>('/api/context');
    return data.files || [];
  }

  async getContextFile(path: string): Promise<ContextFileContent> {
    const safePath = encodeURIComponent(path);
    const data = await this.fetchAPI<ContextFileContent>(
      `/api/context/${safePath}`
    );
    return data;
  }

  async listDirectory(path = ''): Promise<DirectoryListResponse> {
    return this.fetchAPI<DirectoryListResponse>('/api/local-projects/list-directory', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
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

  async createProject(
    _path: string,
    _options?: { favorite?: boolean; color?: string; name?: string; description?: string | null }
  ): Promise<Project> {
    throw new Error('createProject is not implemented for the Tauri backend yet');
  }

  async updateProject(
    _projectId: string,
    _updates: Partial<Pick<Project, 'name' | 'color' | 'favorite' | 'description'>>
  ): Promise<Project | undefined> {
    throw new Error('updateProject is not implemented for the Tauri backend yet');
  }

  async deleteProject(_projectId: string): Promise<void> {
    throw new Error('deleteProject is not implemented for the Tauri backend yet');
  }

  async validateProject(_projectId: string): Promise<ProjectValidationResponse> {
    throw new Error('validateProject is not implemented for the Tauri backend yet');
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

  async searchSpecs(_query: string, _filters?: Record<string, unknown>): Promise<SearchResult> {
    throw new Error('searchSpecs is not implemented for the Tauri backend yet');
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

  async getContextFiles(): Promise<ContextFileListItem[]> {
    if (!this.currentProjectId) {
      throw new Error('No project selected');
    }
    throw new Error('getContextFiles is not implemented for the Tauri backend yet');
  }

  async getContextFile(_path: string): Promise<ContextFileContent> {
    if (!this.currentProjectId) {
      throw new Error('No project selected');
    }
    throw new Error('getContextFile is not implemented for the Tauri backend yet');
  }

  async listDirectory(_path = ''): Promise<DirectoryListResponse> {
    throw new Error('listDirectory is not implemented for the Tauri backend yet');
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
