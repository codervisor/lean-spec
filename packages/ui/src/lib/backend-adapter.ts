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
  ProjectStatsResponse,
  ProjectValidationResponse,
  ProjectsResponse,
  ListSpecsResponse,
  ProjectContext,
  MachinesResponse,
  Session,
  SessionArchiveResult,
  SessionEvent,
  SessionLog,
  SessionMode,
  SpecTokenResponse,
  SpecValidationResponse,
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
  setMachineId(machineId: string | null): void;

  // Machine operations
  getMachines(): Promise<MachinesResponse>;
  renameMachine(machineId: string, label: string): Promise<void>;
  revokeMachine(machineId: string): Promise<void>;
  requestExecution(machineId: string, payload: Record<string, unknown>): Promise<void>;

  // Project operations
  getProjects(): Promise<ProjectsResponse>;
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
  getSpecs(projectId: string, params?: ListParams): Promise<Spec[]>;
  getSpec(projectId: string, specName: string): Promise<SpecDetail>;
  getSpecTokens(projectId: string, specName: string): Promise<SpecTokenResponse>;
  getSpecValidation(projectId: string, specName: string): Promise<SpecValidationResponse>;
  updateSpec(
    projectId: string,
    specName: string,
    updates: Partial<Pick<Spec, 'status' | 'priority' | 'tags'>> & { expectedContentHash?: string }
  ): Promise<void>;

  // Stats and dependencies
  getStats(projectId: string): Promise<Stats>;
  getProjectStats(projectId: string): Promise<Stats>;
  getDependencies(projectId: string, specName?: string): Promise<DependencyGraph>;

  // Context files & local filesystem
  getContextFiles(): Promise<ContextFileListItem[]>;
  getContextFile(path: string): Promise<ContextFileContent>;
  getProjectContext(projectId: string): Promise<ProjectContext>;
  listDirectory(path?: string): Promise<DirectoryListResponse>;

  // Sessions
  listSessions(params?: { specId?: string; status?: string; tool?: string }): Promise<Session[]>;
  getSession(sessionId: string): Promise<Session>;
  createSession(payload: {
    projectPath: string;
    specId?: string | null;
    tool: string;
    mode: SessionMode;
  }): Promise<Session>;
  startSession(sessionId: string): Promise<Session>;
  pauseSession(sessionId: string): Promise<Session>;
  resumeSession(sessionId: string): Promise<Session>;
  stopSession(sessionId: string): Promise<Session>;
  archiveSession(sessionId: string, options?: { compress?: boolean }): Promise<SessionArchiveResult>;
  deleteSession(sessionId: string): Promise<void>;
  getSessionLogs(sessionId: string): Promise<SessionLog[]>;
  getSessionEvents(sessionId: string): Promise<SessionEvent[]>;
  listAvailableTools(): Promise<string[]>;
}

/**
 * HTTP adapter for web browser - connects to Rust HTTP server
 */
export class HttpBackendAdapter implements BackendAdapter {
  private baseUrl: string;
  private machineId: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || import.meta.env.VITE_API_URL || '';
  }

  setMachineId(machineId: string | null) {
    this.machineId = machineId;
  }

  private async fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const syncApiKey = import.meta.env.VITE_SYNC_API_KEY as string | undefined;
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.machineId ? { 'X-LeanSpec-Machine': this.machineId } : {}),
        ...(syncApiKey ? { 'X-API-Key': syncApiKey } : {}),
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

  async getMachines(): Promise<MachinesResponse> {
    return this.fetchAPI<MachinesResponse>('/api/sync/machines');
  }

  async renameMachine(machineId: string, label: string): Promise<void> {
    await this.fetchAPI(`/api/sync/machines/${encodeURIComponent(machineId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ label }),
    });
  }

  async revokeMachine(machineId: string): Promise<void> {
    await this.fetchAPI(`/api/sync/machines/${encodeURIComponent(machineId)}`, {
      method: 'DELETE',
    });
  }

  async requestExecution(machineId: string, payload: Record<string, unknown>): Promise<void> {
    await this.fetchAPI(`/api/sync/machines/${encodeURIComponent(machineId)}/execution`, {
      method: 'POST',
      body: JSON.stringify({ payload }),
    });
  }

  async createProject(
    path: string,
    options?: { favorite?: boolean; color?: string; name?: string; description?: string | null }
  ): Promise<Project> {
    // Rust backend returns Project directly (not wrapped in { project: ... })
    const project = await this.fetchAPI<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ path, ...options }),
    });
    return project;
  }

  async updateProject(
    projectId: string,
    updates: Partial<Pick<Project, 'name' | 'color' | 'favorite' | 'description'>>
  ): Promise<Project | undefined> {
    // Rust backend returns Project directly (not wrapped in { project: ... })
    const project = await this.fetchAPI<Project>(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return project;
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

  async getSpecs(projectId: string, params?: ListParams): Promise<Spec[]> {
    const query = params
      ? new URLSearchParams(
        Object.entries(params).reduce<string[][]>((acc, [key, value]) => {
          if (typeof value === 'string' && value.length > 0) acc.push([key, value]);
          return acc;
        }, [])
      ).toString()
      : '';
    const endpoint = query
      ? `/api/projects/${encodeURIComponent(projectId)}/specs?${query}`
      : `/api/projects/${encodeURIComponent(projectId)}/specs`;
    const data = await this.fetchAPI<ListSpecsResponse>(endpoint);
    return data.specs || [];
  }

  async getSpec(projectId: string, specName: string): Promise<SpecDetail> {
    const data = await this.fetchAPI<SpecDetail | { spec: SpecDetail }>(
      `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(specName)}`
    );
    return 'spec' in data ? data.spec : data;
  }

  async getSpecTokens(projectId: string, specName: string): Promise<SpecTokenResponse> {
    return this.fetchAPI<SpecTokenResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(specName)}/tokens`
    );
  }

  async getSpecValidation(projectId: string, specName: string): Promise<SpecValidationResponse> {
    return this.fetchAPI<SpecValidationResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(specName)}/validation`
    );
  }

  async updateSpec(
    projectId: string,
    specName: string,
    updates: Partial<Pick<Spec, 'status' | 'priority' | 'tags'>> & { expectedContentHash?: string }
  ): Promise<void> {
    await this.fetchAPI(`/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(specName)}/metadata`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async getStats(projectId: string): Promise<Stats> {
    const data = await this.fetchAPI<Stats | { stats: Stats }>(
      `/api/projects/${encodeURIComponent(projectId)}/stats`
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

  async getDependencies(projectId: string, _specName?: string): Promise<DependencyGraph> {
    // Note: specName parameter is ignored for HTTP adapter as the project endpoint
    // returns the full dependency graph. Individual spec dependencies can be computed client-side.
    const data = await this.fetchAPI<DependencyGraph>(
      `/api/projects/${encodeURIComponent(projectId)}/dependencies`
    );
    return data;
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

  async getProjectContext(projectId: string): Promise<ProjectContext> {
    const data = await this.fetchAPI<ProjectContext>(
      `/api/projects/${encodeURIComponent(projectId)}/context`
    );
    return data;
  }

  async listDirectory(path = ''): Promise<DirectoryListResponse> {
    return this.fetchAPI<DirectoryListResponse>('/api/local-projects/list-directory', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async listSessions(params?: { specId?: string; status?: string; tool?: string }): Promise<Session[]> {
    const query = params
      ? new URLSearchParams(
        Object.entries(params).reduce<string[][]>((acc, [key, value]) => {
          if (typeof value === 'string' && value.length > 0) {
            acc.push([key === 'specId' ? 'spec_id' : key, value]);
          }
          return acc;
        }, [])
      ).toString()
      : '';
    const endpoint = query ? `/api/sessions?${query}` : '/api/sessions';
    return this.fetchAPI<Session[]>(endpoint);
  }

  async getSession(sessionId: string): Promise<Session> {
    return this.fetchAPI<Session>(`/api/sessions/${encodeURIComponent(sessionId)}`);
  }

  async createSession(payload: {
    projectPath: string;
    specId?: string | null;
    tool: string;
    mode: SessionMode;
  }): Promise<Session> {
    return this.fetchAPI<Session>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        project_path: payload.projectPath,
        spec_id: payload.specId ?? null,
        tool: payload.tool,
        mode: payload.mode,
      }),
    });
  }

  async startSession(sessionId: string): Promise<Session> {
    return this.fetchAPI<Session>(`/api/sessions/${encodeURIComponent(sessionId)}/start`, {
      method: 'POST',
    });
  }

  async pauseSession(sessionId: string): Promise<Session> {
    return this.fetchAPI<Session>(`/api/sessions/${encodeURIComponent(sessionId)}/pause`, {
      method: 'POST',
    });
  }

  async resumeSession(sessionId: string): Promise<Session> {
    return this.fetchAPI<Session>(`/api/sessions/${encodeURIComponent(sessionId)}/resume`, {
      method: 'POST',
    });
  }

  async stopSession(sessionId: string): Promise<Session> {
    return this.fetchAPI<Session>(`/api/sessions/${encodeURIComponent(sessionId)}/stop`, {
      method: 'POST',
    });
  }

  async archiveSession(sessionId: string, options?: { compress?: boolean }): Promise<SessionArchiveResult> {
    return this.fetchAPI<SessionArchiveResult>(`/api/sessions/${encodeURIComponent(sessionId)}/archive`, {
      method: 'POST',
      body: JSON.stringify({
        compress: options?.compress ?? false,
      }),
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.fetchAPI(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
  }

  async getSessionLogs(sessionId: string): Promise<SessionLog[]> {
    return this.fetchAPI<SessionLog[]>(`/api/sessions/${encodeURIComponent(sessionId)}/logs`);
  }

  async getSessionEvents(sessionId: string): Promise<SessionEvent[]> {
    return this.fetchAPI<SessionEvent[]>(`/api/sessions/${encodeURIComponent(sessionId)}/events`);
  }

  async listAvailableTools(): Promise<string[]> {
    return this.fetchAPI<string[]>('/api/tools');
  }
}

/**
 * Tauri adapter for desktop app - uses IPC commands
 */
export class TauriBackendAdapter implements BackendAdapter {
  setMachineId(_machineId: string | null) {
    // No-op for desktop
  }

  async getMachines(): Promise<MachinesResponse> {
    throw new Error('getMachines is not implemented for the Tauri backend yet');
  }

  async renameMachine(_machineId: string, _label: string): Promise<void> {
    throw new Error('renameMachine is not implemented for the Tauri backend yet');
  }

  async revokeMachine(_machineId: string): Promise<void> {
    throw new Error('revokeMachine is not implemented for the Tauri backend yet');
  }

  async requestExecution(_machineId: string, _payload: Record<string, unknown>): Promise<void> {
    throw new Error('requestExecution is not implemented for the Tauri backend yet');
  }
  private async invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    // Dynamic import to avoid bundling Tauri in web builds
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(command, args);
  }

  async getProjects(): Promise<ProjectsResponse> {
    const data = await this.invoke<{
      projects: Project[];
      recentProjects?: string[];
      favoriteProjects?: string[];
    }>('desktop_bootstrap');

    return {
      projects: data.projects,
      recentProjects: data.recentProjects,
      favoriteProjects: data.favoriteProjects,
    };
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

  async getSpecs(projectId: string, _params?: ListParams): Promise<Spec[]> {
    // Tauri commands return LightweightSpec[], need to map to Spec[]
    const specs = await this.invoke<Spec[]>('get_specs', {
      projectId
    });
    return specs;
  }

  async getSpec(projectId: string, specName: string): Promise<SpecDetail> {
    const spec = await this.invoke<SpecDetail>('get_spec_detail', {
      projectId,
      specId: specName,
    });
    return spec;
  }

  async getSpecTokens(_projectId: string, _specName: string): Promise<SpecTokenResponse> {
    throw new Error('getSpecTokens is not implemented for the Tauri backend yet');
  }

  async getSpecValidation(_projectId: string, _specName: string): Promise<SpecValidationResponse> {
    throw new Error('getSpecValidation is not implemented for the Tauri backend yet');
  }

  async updateSpec(
    projectId: string,
    specName: string,
    updates: Partial<Pick<Spec, 'status' | 'priority' | 'tags'>> & { expectedContentHash?: string }
  ): Promise<void> {
    // For now, only status update is supported
    if (updates.status) {
      await this.invoke('update_spec_status', {
        projectId,
        specId: specName,
        newStatus: updates.status,
      });
    }
  }

  async getStats(projectId: string): Promise<Stats> {
    const stats = await this.invoke<Stats>('get_project_stats', {
      projectId,
    });
    return stats;
  }

  async getProjectStats(projectId: string): Promise<Stats> {
    const stats = await this.invoke<Stats>('get_project_stats', {
      projectId,
    });
    return stats;
  }

  async getDependencies(projectId: string, _specName?: string): Promise<DependencyGraph> {
    return this.invoke<DependencyGraph>('get_dependency_graph', {
      projectId,
    });
  }

  async getContextFiles(): Promise<ContextFileListItem[]> {
    throw new Error('getContextFiles is not implemented for the Tauri backend yet');
  }

  async getContextFile(_path: string): Promise<ContextFileContent> {
    throw new Error('getContextFile is not implemented for the Tauri backend yet');
  }

  async getProjectContext(_projectId: string): Promise<ProjectContext> {
    throw new Error('getProjectContext is not implemented for the Tauri backend yet');
  }

  async listDirectory(_path = ''): Promise<DirectoryListResponse> {
    throw new Error('listDirectory is not implemented for the Tauri backend yet');
  }

  async listSessions(): Promise<Session[]> {
    throw new Error('listSessions is not implemented for the Tauri backend yet');
  }

  async getSession(_sessionId: string): Promise<Session> {
    throw new Error('getSession is not implemented for the Tauri backend yet');
  }

  async createSession(): Promise<Session> {
    throw new Error('createSession is not implemented for the Tauri backend yet');
  }

  async startSession(): Promise<Session> {
    throw new Error('startSession is not implemented for the Tauri backend yet');
  }

  async pauseSession(): Promise<Session> {
    throw new Error('pauseSession is not implemented for the Tauri backend yet');
  }

  async resumeSession(): Promise<Session> {
    throw new Error('resumeSession is not implemented for the Tauri backend yet');
  }

  async stopSession(): Promise<Session> {
    throw new Error('stopSession is not implemented for the Tauri backend yet');
  }

  async archiveSession(): Promise<SessionArchiveResult> {
    throw new Error('archiveSession is not implemented for the Tauri backend yet');
  }

  async deleteSession(): Promise<void> {
    throw new Error('deleteSession is not implemented for the Tauri backend yet');
  }

  async getSessionLogs(): Promise<SessionLog[]> {
    throw new Error('getSessionLogs is not implemented for the Tauri backend yet');
  }

  async getSessionEvents(): Promise<SessionEvent[]> {
    throw new Error('getSessionEvents is not implemented for the Tauri backend yet');
  }

  async listAvailableTools(): Promise<string[]> {
    throw new Error('listAvailableTools is not implemented for the Tauri backend yet');
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
