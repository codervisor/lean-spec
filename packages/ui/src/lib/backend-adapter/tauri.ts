import type {
  BackendAdapter,
  BatchMetadataResponse,
  ContextFileContent,
  ContextFileListItem,
  DependencyGraph,
  DirectoryListResponse,
  FileContentResponse,
  FileListResponse,
  FileSearchResponse,
  ListParams,
  Spec,
  SpecDetail,
  Stats,
  Project,
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
  ChatConfig,
  ChatStorageInfo,
  ModelsRegistryResponse,
  SpecTokenResponse,
  SpecValidationResponse,
  RunnerDefinition,
  RunnerListResponse,
  RunnerScope,
  RunnerValidateResponse,
  RunnerVersionResponse,
} from './core';

/**
 * Tauri adapter for desktop app - uses IPC commands
 */
export class TauriBackendAdapter implements BackendAdapter {
  setMachineId(machineId: string | null) {
    void machineId;
    // No-op for desktop
  }

  async getMachines(): Promise<MachinesResponse> {
    throw new Error('getMachines is not implemented for the Tauri backend yet');
  }

  async renameMachine(machineId: string, label: string): Promise<void> {
    void machineId;
    void label;
    throw new Error('renameMachine is not implemented for the Tauri backend yet');
  }

  async revokeMachine(machineId: string): Promise<void> {
    void machineId;
    throw new Error('revokeMachine is not implemented for the Tauri backend yet');
  }

  async requestExecution(machineId: string, payload: Record<string, unknown>): Promise<void> {
    void machineId;
    void payload;
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
    path: string,
    options?: { favorite?: boolean; color?: string; name?: string; description?: string | null }
  ): Promise<Project> {
    void path;
    void options;
    throw new Error('createProject is not implemented for the Tauri backend yet');
  }

  async updateProject(
    projectId: string,
    updates: Partial<Pick<Project, 'name' | 'color' | 'favorite' | 'description'>>
  ): Promise<Project | undefined> {
    void projectId;
    void updates;
    throw new Error('updateProject is not implemented for the Tauri backend yet');
  }

  async deleteProject(projectId: string): Promise<void> {
    void projectId;
    throw new Error('deleteProject is not implemented for the Tauri backend yet');
  }

  async validateProject(projectId: string): Promise<ProjectValidationResponse> {
    void projectId;
    throw new Error('validateProject is not implemented for the Tauri backend yet');
  }

  async getSpecs(projectId: string, params?: ListParams): Promise<Spec[]> {
    void params;
    // Tauri commands return LightweightSpec[], need to map to Spec[]
    const specs = await this.invoke<Spec[]>('get_specs', {
      projectId,
    });
    return specs;
  }

  async getSpecsWithHierarchy(projectId: string, params?: ListParams): Promise<ListSpecsResponse> {
    // Tauri backend doesn't support server-side hierarchy yet
    const specs = await this.getSpecs(projectId, params);
    return { specs, total: specs.length };
  }

  async getSpec(projectId: string, specName: string): Promise<SpecDetail> {
    const spec = await this.invoke<SpecDetail>('get_spec_detail', {
      projectId,
      specId: specName,
    });
    return spec;
  }

  async getSpecTokens(projectId: string, specName: string): Promise<SpecTokenResponse> {
    void projectId;
    void specName;
    throw new Error('getSpecTokens is not implemented for the Tauri backend yet');
  }

  async getSpecValidation(projectId: string, specName: string): Promise<SpecValidationResponse> {
    void projectId;
    void specName;
    throw new Error('getSpecValidation is not implemented for the Tauri backend yet');
  }

  async getBatchMetadata(projectId: string, specNames: string[]): Promise<BatchMetadataResponse> {
    void projectId;
    void specNames;
    throw new Error('getBatchMetadata is not implemented for the Tauri backend yet');
  }

  async updateSpec(
    projectId: string,
    specName: string,
    updates: Partial<Pick<Spec, 'status' | 'priority' | 'tags'>> & {
      expectedContentHash?: string;
      parent?: string | null;
      addDependsOn?: string[];
      removeDependsOn?: string[];
      force?: boolean;
    }
  ): Promise<void> {
    // For now, only status update is supported
    if (updates.status && !updates.parent && !updates.addDependsOn?.length && !updates.removeDependsOn?.length) {
      await this.invoke('update_spec_status', {
        projectId,
        specId: specName,
        newStatus: updates.status,
        force: updates.force ?? false,
      });
      return;
    }
    throw new Error('Relationship updates are not implemented for the Tauri backend yet');
  }

  async toggleSpecChecklist(
    projectId: string,
    specName: string,
    toggles: { itemText: string; checked: boolean }[],
    options?: { expectedContentHash?: string; subspec?: string }
  ): Promise<{ success: boolean; contentHash: string; toggled: { itemText: string; checked: boolean; line: number }[] }> {
    void projectId;
    void specName;
    void toggles;
    void options;
    throw new Error('toggleSpecChecklist is not implemented for the Tauri backend yet');
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

  async getDependencies(projectId: string, specName?: string): Promise<DependencyGraph> {
    void specName;
    return this.invoke<DependencyGraph>('get_dependency_graph', {
      projectId,
    });
  }

  async getContextFiles(): Promise<ContextFileListItem[]> {
    throw new Error('getContextFiles is not implemented for the Tauri backend yet');
  }

  async getContextFile(path: string): Promise<ContextFileContent> {
    void path;
    throw new Error('getContextFile is not implemented for the Tauri backend yet');
  }

  async getProjectContext(projectId: string): Promise<ProjectContext> {
    void projectId;
    throw new Error('getProjectContext is not implemented for the Tauri backend yet');
  }

  async listDirectory(path = ''): Promise<DirectoryListResponse> {
    void path;
    throw new Error('listDirectory is not implemented for the Tauri backend yet');
  }

  async listSessions(params?: { projectId?: string; specId?: string; status?: string; runner?: string }): Promise<Session[]> {
    return this.invoke<Session[]>('desktop_list_sessions', {
      params: params
        ? {
          projectId: params.projectId,
          specId: params.specId,
          status: params.status,
          runner: params.runner,
        }
        : undefined,
    });
  }

  async getSession(sessionId: string): Promise<Session> {
    void sessionId;
    throw new Error('getSession is not implemented for the Tauri backend yet');
  }

  async createSession(payload: {
    projectPath: string;
    specIds?: string[];
    specId?: string | null;
    prompt?: string | null;
    runner?: string;
    mode: SessionMode;
  }): Promise<Session> {
    void payload;
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

  async respondToSessionPermission(): Promise<Session> {
    throw new Error('respondToSessionPermission is not implemented for the Tauri backend yet');
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

  async listAvailableRunners(projectPath?: string): Promise<string[]> {
    const response = await this.listRunners(projectPath);
    const runners = response?.runners ?? [];
    return runners.filter((runner) => runner.available === true).map((runner) => runner.id);
  }

  async listRunners(projectPath?: string, options?: { skipValidation?: boolean }): Promise<RunnerListResponse> {
    return this.invoke<RunnerListResponse>('desktop_list_runners', {
      projectPath,
      skipValidation: options?.skipValidation ?? false,
    });
  }

  async getRunner(runnerId: string, projectPath?: string): Promise<RunnerDefinition> {
    return this.invoke<RunnerDefinition>('desktop_get_runner', {
      runnerId,
      projectPath,
    });
  }

  async createRunner(payload: {
    projectPath: string;
    runner: {
      id: string;
      name?: string | null;
      command?: string | null;
      args?: string[];
      env?: Record<string, string>;
    };
    scope?: RunnerScope;
  }): Promise<RunnerListResponse> {
    return this.invoke<RunnerListResponse>('desktop_create_runner', {
      projectPath: payload.projectPath,
      runner: payload.runner,
      scope: payload.scope,
    });
  }

  async updateRunner(
    runnerId: string,
    payload: {
      projectPath: string;
      runner: {
        name?: string | null;
        command?: string | null;
        args?: string[];
        env?: Record<string, string>;
      };
      scope?: RunnerScope;
    }
  ): Promise<RunnerDefinition> {
    const response = await this.invoke<RunnerDefinition | RunnerListResponse>('desktop_update_runner', {
      runnerId,
      projectPath: payload.projectPath,
      runner: payload.runner,
      scope: payload.scope,
    });

    if ('runners' in response) {
      const updated = response.runners.find((runner) => runner.id === runnerId);
      if (updated) {
        return updated;
      }
      throw new Error(`Runner '${runnerId}' not found in update response`);
    }

    return response;
  }

  async deleteRunner(
    runnerId: string,
    payload: { projectPath: string; scope?: RunnerScope }
  ): Promise<RunnerListResponse> {
    return this.invoke<RunnerListResponse>('desktop_delete_runner', {
      runnerId,
      projectPath: payload.projectPath,
      scope: payload.scope,
    });
  }

  async validateRunner(runnerId: string, projectPath?: string): Promise<RunnerValidateResponse> {
    return this.invoke<RunnerValidateResponse>('desktop_validate_runner', {
      runnerId,
      projectPath,
    });
  }

  async getRunnerVersion(runnerId: string, projectPath?: string): Promise<RunnerVersionResponse> {
    return this.invoke<RunnerVersionResponse>('desktop_get_runner_version', {
      runnerId,
      projectPath,
    });
  }

  async setDefaultRunner(payload: {
    projectPath: string;
    runnerId: string;
    scope?: RunnerScope;
  }): Promise<RunnerListResponse> {
    return this.invoke<RunnerListResponse>('desktop_set_default_runner', {
      projectPath: payload.projectPath,
      runnerId: payload.runnerId,
      scope: payload.scope,
    });
  }

  async getChatConfig(): Promise<ChatConfig> {
    return this.invoke<ChatConfig>('desktop_get_chat_config');
  }

  async updateChatConfig(config: ChatConfig): Promise<ChatConfig> {
    return this.invoke<ChatConfig>('desktop_update_chat_config', {
      config,
    });
  }

  async getChatStorageInfo(): Promise<ChatStorageInfo> {
    return this.invoke<ChatStorageInfo>('desktop_get_chat_storage_info');
  }

  async getModelsProviders(options?: { agenticOnly?: boolean }): Promise<ModelsRegistryResponse> {
    return this.invoke<ModelsRegistryResponse>('desktop_get_models_providers', {
      agenticOnly: options?.agenticOnly ?? false,
    });
  }

  async refreshModelsRegistry(): Promise<void> {
    await this.invoke('desktop_refresh_models_registry');
  }

  async setProviderApiKey(providerId: string, apiKey: string, baseUrl?: string): Promise<void> {
    await this.invoke('desktop_set_provider_api_key', {
      providerId,
      apiKey,
      baseUrl,
    });
  }

  // Codebase file browsing (spec 246) - delegate to Rust HTTP server via IPC
  async getProjectFiles(projectId: string, path?: string): Promise<FileListResponse> {
    return this.invoke<FileListResponse>('desktop_get_project_files', { projectId, path });
  }

  async getProjectFile(projectId: string, path: string): Promise<FileContentResponse> {
    return this.invoke<FileContentResponse>('desktop_get_project_file', { projectId, path });
  }

  async searchProjectFiles(projectId: string, query: string, limit?: number): Promise<FileSearchResponse> {
    return this.invoke<FileSearchResponse>('desktop_search_project_files', { projectId, query, limit });
  }
}
