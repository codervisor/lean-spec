import type {
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
} from '../../types/api';

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
  /** Get specs with optional pre-built hierarchy tree for performance */
  getSpecsWithHierarchy(projectId: string, params?: ListParams): Promise<ListSpecsResponse>;
  getSpec(projectId: string, specName: string): Promise<SpecDetail>;
  getSpecTokens(projectId: string, specName: string): Promise<SpecTokenResponse>;
  getSpecValidation(projectId: string, specName: string): Promise<SpecValidationResponse>;
  getBatchMetadata(projectId: string, specNames: string[]): Promise<BatchMetadataResponse>;
  updateSpec(
    projectId: string,
    specName: string,
    updates: Partial<Pick<Spec, 'status' | 'priority' | 'tags'>> & {
      expectedContentHash?: string;
      parent?: string | null;
      addDependsOn?: string[];
      removeDependsOn?: string[];
    }
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
  listSessions(params?: { specId?: string; status?: string; runner?: string }): Promise<Session[]>;
  getSession(sessionId: string): Promise<Session>;
  createSession(payload: {
    projectPath: string;
    specId?: string | null;
    runner?: string;
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
  listAvailableRunners(projectPath?: string): Promise<string[]>;
  listRunners(projectPath?: string): Promise<RunnerListResponse>;
  getRunner(runnerId: string, projectPath?: string): Promise<RunnerDefinition>;
  createRunner(payload: {
    projectPath: string;
    runner: {
      id: string;
      name?: string | null;
      command: string;
      args?: string[];
      env?: Record<string, string>;
    };
    scope?: RunnerScope;
  }): Promise<RunnerListResponse>;
  updateRunner(
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
  ): Promise<RunnerListResponse>;
  deleteRunner(
    runnerId: string,
    payload: { projectPath: string; scope?: RunnerScope }
  ): Promise<RunnerListResponse>;
  validateRunner(runnerId: string, projectPath?: string): Promise<RunnerValidateResponse>;
  setDefaultRunner(payload: {
    projectPath: string;
    runnerId: string;
    scope?: RunnerScope;
  }): Promise<RunnerListResponse>;
}

export type {
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
};
