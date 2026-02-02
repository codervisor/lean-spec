import { getBackend, APIError, type BackendAdapter } from "./backend-adapter";
import i18n from "./i18n";
import type { ListParams, Spec, SpecDetail, Stats, DependencyGraph, MachinesResponse, Session, SessionLog, SessionMode } from "../types/api";

/**
 * Project-aware API wrapper
 * Automatically injects currentProjectId from context into backend adapter calls
 */
class ProjectAPI {
  private backend: BackendAdapter;
  private _currentProjectId: string | null = null;

  constructor() {
    this.backend = getBackend();
  }

  setCurrentProjectId(projectId: string | null) {
    this._currentProjectId = projectId;
  }

  setCurrentMachineId(machineId: string | null) {
    this.backend.setMachineId(machineId);
  }

  getCurrentProjectId(): string {
    if (!this._currentProjectId) {
      throw new Error(i18n.t('projects.errors.noProjectSelected', { ns: 'common' }));
    }
    return this._currentProjectId;
  }

  // Pass-through methods that don't need projectId
  getMachines = (): Promise<MachinesResponse> => this.backend.getMachines();
  renameMachine = (machineId: string, label: string) => this.backend.renameMachine(machineId, label);
  revokeMachine = (machineId: string) => this.backend.revokeMachine(machineId);
  requestExecution = (machineId: string, payload: Record<string, unknown>) =>
    this.backend.requestExecution(machineId, payload);

  getProjects = () => this.backend.getProjects();
  createProject = (path: string, options?: { favorite?: boolean; color?: string; name?: string; description?: string | null }) =>
    this.backend.createProject(path, options);
  updateProject = (projectId: string, updates: Parameters<BackendAdapter['updateProject']>[1]) =>
    this.backend.updateProject(projectId, updates);
  deleteProject = (projectId: string) => this.backend.deleteProject(projectId);
  validateProject = (projectId: string) => this.backend.validateProject(projectId);
  listDirectory = (path?: string) => this.backend.listDirectory(path);
  getContextFiles = () => this.backend.getContextFiles();
  getContextFile = (path: string) => this.backend.getContextFile(path);

  // Project-scoped methods that automatically inject currentProjectId
  async getProjectContext(): Promise<import('../types/api').ProjectContext> {
    return this.backend.getProjectContext(this.getCurrentProjectId());
  }

  async getSpecs(params?: ListParams): Promise<Spec[]> {
    return this.backend.getSpecs(this.getCurrentProjectId(), params);
  }

  /**
   * Get specs with optional pre-built hierarchy tree for performance.
   * Use hierarchy: true to get server-side computed tree structure.
   */
  async getSpecsWithHierarchy(params?: ListParams): Promise<import('../types/api').ListSpecsResponse> {
    return this.backend.getSpecsWithHierarchy(this.getCurrentProjectId(), params);
  }

  async getSpec(specName: string): Promise<SpecDetail> {
    return this.backend.getSpec(this.getCurrentProjectId(), specName);
  }

  async updateSpec(
    specName: string,
    updates: Partial<Pick<Spec, 'status' | 'priority' | 'tags'>> & {
      expectedContentHash?: string;
      parent?: string | null;
      addDependsOn?: string[];
      removeDependsOn?: string[];
    }
  ): Promise<void> {
    return this.backend.updateSpec(this.getCurrentProjectId(), specName, updates);
  }

  async getStats(): Promise<Stats> {
    return this.backend.getStats(this.getCurrentProjectId());
  }

  async getProjectStats(projectId: string): Promise<Stats> {
    return this.backend.getProjectStats(projectId);
  }

  async getDependencies(specName?: string): Promise<DependencyGraph> {
    return this.backend.getDependencies(this.getCurrentProjectId(), specName);
  }

  listSessions(params?: { specId?: string; status?: string; runner?: string }): Promise<Session[]> {
    return this.backend.listSessions(params);
  }

  getSession(sessionId: string): Promise<Session> {
    return this.backend.getSession(sessionId);
  }

  createSession(payload: { projectPath: string; specId?: string | null; runner?: string; mode: SessionMode }): Promise<Session> {
    return this.backend.createSession(payload);
  }

  startSession(sessionId: string): Promise<Session> {
    return this.backend.startSession(sessionId);
  }

  pauseSession(sessionId: string): Promise<Session> {
    return this.backend.pauseSession(sessionId);
  }

  resumeSession(sessionId: string): Promise<Session> {
    return this.backend.resumeSession(sessionId);
  }

  stopSession(sessionId: string): Promise<Session> {
    return this.backend.stopSession(sessionId);
  }

  archiveSession(sessionId: string, options?: { compress?: boolean }) {
    return this.backend.archiveSession(sessionId, options);
  }

  deleteSession(sessionId: string): Promise<void> {
    return this.backend.deleteSession(sessionId);
  }

  getSessionLogs(sessionId: string): Promise<SessionLog[]> {
    return this.backend.getSessionLogs(sessionId);
  }

  getSessionEvents(sessionId: string) {
    return this.backend.getSessionEvents(sessionId);
  }

  listAvailableRunners(projectPath?: string): Promise<string[]> {
    return this.backend.listAvailableRunners(projectPath);
  }
}

export const api = new ProjectAPI();

export { APIError };