import { APIError } from './core';
import type {
  BackendAdapter,
  BatchMetadataResponse,
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
  RunnerDefinition,
  RunnerListResponse,
  RunnerScope,
  RunnerValidateResponse,
} from './core';

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
    const data = await this.getSpecsWithHierarchy(projectId, params);
    return data.specs || [];
  }

  async getSpecsWithHierarchy(projectId: string, params?: ListParams): Promise<ListSpecsResponse> {
    const query = params
      ? new URLSearchParams(
        Object.entries(params).reduce<string[][]>((acc, [key, value]) => {
          if (typeof value === 'string' && value.length > 0) acc.push([key, value]);
          if (typeof value === 'boolean') acc.push([key, String(value)]);
          return acc;
        }, [])
      ).toString()
      : '';
    const endpoint = query
      ? `/api/projects/${encodeURIComponent(projectId)}/specs?${query}`
      : `/api/projects/${encodeURIComponent(projectId)}/specs`;
    return this.fetchAPI<ListSpecsResponse>(endpoint);
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

  async getBatchMetadata(projectId: string, specNames: string[]): Promise<BatchMetadataResponse> {
    return this.fetchAPI<BatchMetadataResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/specs/batch-metadata`,
      {
        method: 'POST',
        body: JSON.stringify({ specNames }),
      }
    );
  }

  async updateSpec(
    projectId: string,
    specName: string,
    updates: Partial<Pick<Spec, 'status' | 'priority' | 'tags'>> & {
      expectedContentHash?: string;
      parent?: string | null;
      addDependsOn?: string[];
      removeDependsOn?: string[];
    }
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

  async getDependencies(projectId: string, specName?: string): Promise<DependencyGraph> {
    void specName;
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

  async listSessions(params?: { specId?: string; status?: string; runner?: string }): Promise<Session[]> {
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
    runner?: string;
    mode: SessionMode;
  }): Promise<Session> {
    return this.fetchAPI<Session>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        project_path: payload.projectPath,
        spec_id: payload.specId ?? null,
        runner: payload.runner,
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

  async listAvailableRunners(projectPath?: string): Promise<string[]> {
    const response = await this.listRunners(projectPath);
    return (response?.runners ?? []).filter((runner) => runner.available).map((runner) => runner.id);
  }

  async listRunners(projectPath?: string): Promise<RunnerListResponse> {
    const endpoint = projectPath
      ? `/api/runners?project_path=${encodeURIComponent(projectPath)}`
      : '/api/runners';
    return this.fetchAPI<RunnerListResponse>(endpoint);
  }

  async getRunner(runnerId: string, projectPath?: string): Promise<RunnerDefinition> {
    const endpoint = projectPath
      ? `/api/runners/${encodeURIComponent(runnerId)}?project_path=${encodeURIComponent(projectPath)}`
      : `/api/runners/${encodeURIComponent(runnerId)}`;
    return this.fetchAPI<RunnerDefinition>(endpoint);
  }

  async createRunner(payload: {
    projectPath: string;
    runner: {
      id: string;
      name?: string | null;
      command: string;
      args?: string[];
      env?: Record<string, string>;
    };
    scope?: RunnerScope;
  }): Promise<RunnerListResponse> {
    return this.fetchAPI<RunnerListResponse>('/api/runners', {
      method: 'POST',
      body: JSON.stringify({
        projectPath: payload.projectPath,
        runner: payload.runner,
        scope: payload.scope,
      }),
    });
  }

  async updateRunner(
    runnerId: string,
    payload: {
      projectPath: string;
      runner: {
        name?: string | null;
        command: string;
        args?: string[];
        env?: Record<string, string>;
      };
      scope?: RunnerScope;
    }
  ): Promise<RunnerListResponse> {
    return this.fetchAPI<RunnerListResponse>(`/api/runners/${encodeURIComponent(runnerId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        projectPath: payload.projectPath,
        runner: payload.runner,
        scope: payload.scope,
      }),
    });
  }

  async deleteRunner(
    runnerId: string,
    payload: { projectPath: string; scope?: RunnerScope }
  ): Promise<RunnerListResponse> {
    return this.fetchAPI<RunnerListResponse>(`/api/runners/${encodeURIComponent(runnerId)}`, {
      method: 'DELETE',
      body: JSON.stringify({
        projectPath: payload.projectPath,
        scope: payload.scope,
      }),
    });
  }

  async validateRunner(runnerId: string, projectPath?: string): Promise<RunnerValidateResponse> {
    const endpoint = projectPath
      ? `/api/runners/${encodeURIComponent(runnerId)}/validate?project_path=${encodeURIComponent(projectPath)}`
      : `/api/runners/${encodeURIComponent(runnerId)}/validate`;
    return this.fetchAPI<RunnerValidateResponse>(endpoint, { method: 'POST' });
  }

  async setDefaultRunner(payload: {
    projectPath: string;
    runnerId: string;
    scope?: RunnerScope;
  }): Promise<RunnerListResponse> {
    return this.fetchAPI<RunnerListResponse>('/api/runners/default', {
      method: 'PUT',
      body: JSON.stringify({
        projectPath: payload.projectPath,
        runnerId: payload.runnerId,
        scope: payload.scope,
      }),
    });
  }
}
