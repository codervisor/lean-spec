// API client for connecting to Rust HTTP server

import type {
  DependencyGraph,
  DirectoryListResponse,
  ContextFileContent,
  ContextFileListItem,
  ContextFileListResponse,
  ListParams,
  NextJsSpec,
  NextJsSpecDetail,
  NextJsStats,
  Project as ProjectType,
  ProjectMutationResponse,
  ProjectStatsResponse,
  ProjectValidationResponse,
  ProjectsListResponse,
  ProjectsResponse,
  RustSpec,
  RustSpecDetail,
  RustStats,
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export type Spec = NextJsSpec;
export type SpecDetail = NextJsSpecDetail;
export type Stats = NextJsStats;
export type Project = ProjectType;

class APIError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'APIError';
  }
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new APIError(response.status, error || response.statusText);
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

function toDateOrNull(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function estimateTokenCount(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words * 1.15));
}

export function extractSpecNumber(name: string): number | null {
  const match = name.match(/^(\d+)-/);
  return match ? parseInt(match[1], 10) : null;
}

export function calculateCompletionRate(byStatus: Record<string, number>): number {
  const total = Object.values(byStatus || {}).reduce((sum, count) => sum + count, 0);
  const complete = byStatus?.complete || 0;
  return total > 0 ? (complete / total) * 100 : 0;
}

export function adaptSpec(rustSpec: RustSpec): NextJsSpec {
  return {
    id: rustSpec.name,
    name: rustSpec.name,
    specNumber: extractSpecNumber(rustSpec.name),
    specName: rustSpec.name,
    title: rustSpec.title ?? null,
    status: rustSpec.status ?? null,
    priority: rustSpec.priority ?? null,
    tags: rustSpec.tags ?? null,
    createdAt: toDateOrNull(rustSpec.created),
    updatedAt: toDateOrNull(rustSpec.updated),
  };
}

export function adaptSpecDetail(rustSpec: RustSpecDetail): NextJsSpecDetail {
  return {
    ...adaptSpec(rustSpec),
    content: rustSpec.content ?? '',
    metadata: rustSpec.metadata ?? {},
    dependsOn: rustSpec.depends_on ?? [],
    requiredBy: rustSpec.required_by ?? [],
  };
}

export function adaptStats(rustStats: RustStats): NextJsStats {
  const byStatus = rustStats.by_status || {};
  return {
    totalSpecs: rustStats.total,
    completionRate: calculateCompletionRate(byStatus),
    specsByStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    byPriority: rustStats.by_priority,
    byTag: rustStats.by_tag,
  };
}

export function adaptContextFileListItem(item: ContextFileListItem): ContextFileListItem & { modifiedAt: Date | null } {
  return {
    ...item,
    modifiedAt: item.modified ? toDateOrNull(item.modified) : null,
  };
}

export function adaptContextFileContent(
  response: ContextFileListItem & { content: string; fileType?: string | null }
): ContextFileContent {
  const modifiedAt = response.modified ? toDateOrNull(response.modified) : null;
  const content = response.content || '';
  return {
    ...response,
    fileType: response.fileType || null,
    modified: response.modified ?? null,
    modifiedAt,
    content,
    tokenCount: estimateTokenCount(content),
    lineCount: content.split('\n').length,
  };
}

export function adaptProject(project: ProjectType): ProjectType {
  return {
    ...project,
    name: project.name || project.displayName || project.id,
    displayName: project.displayName || project.name || project.id,
    path: project.path ?? project.specsDir ?? '',
    specsDir: project.specsDir ?? project.path ?? '',
    favorite: project.favorite ?? false,
    color: project.color ?? null,
    description: project.description ?? null,
    lastAccessed: project.lastAccessed ?? null,
  };
}

export function normalizeProjectsResponse(
  data: ProjectsResponse | ProjectsListResponse
): ProjectsResponse {
  if ('projects' in data || 'current_project_id' in data || 'currentProjectId' in data) {
    const listData = data as ProjectsListResponse;
    const projects = (listData.projects || listData.available || []).map(adaptProject);
    const currentId = listData.current_project_id || listData.currentProjectId || null;
    const current = currentId
      ? projects.find((project: ProjectsResponse['available'][number]) => project.id === currentId) || null
      : listData.current
        ? adaptProject(listData.current)
        : null;

    return {
      current,
      available: projects,
      projects,
    };
  }

  const responseData = data as ProjectsResponse;
  return {
    current: responseData.current ? adaptProject(responseData.current) : null,
    available: (responseData.available || []).map(adaptProject),
    projects: responseData.available ? responseData.available.map(adaptProject) : undefined,
  };
}

export const api = {
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
    const data = await fetchAPI<{ specs: RustSpec[] }>(endpoint);
    return data.specs.map(adaptSpec);
  },

  async getSpec(name: string): Promise<SpecDetail> {
    const data = await fetchAPI<{ spec: RustSpecDetail }>(`/api/specs/${encodeURIComponent(name)}`);
    return adaptSpecDetail(data.spec);
  },

  async getStats(): Promise<Stats> {
    const data = await fetchAPI<RustStats | { stats: RustStats }>('/api/stats');
    const statsPayload = 'stats' in data ? data.stats : data;
    return adaptStats(statsPayload);
  },

  async getDependencies(specName?: string): Promise<DependencyGraph> {
    const endpoint = specName
      ? `/api/specs/${encodeURIComponent(specName)}/dependencies`
      : '/api/dependencies';
    const data = await fetchAPI<{ graph: DependencyGraph } | DependencyGraph>(endpoint);
    return 'graph' in data ? data.graph : data;
  },

  async updateSpec(
    name: string,
    updates: Partial<Pick<Spec, 'status' | 'priority' | 'tags'>>
  ): Promise<void> {
    await fetchAPI(`/api/specs/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async getProjects(): Promise<ProjectsResponse> {
    const data = await fetchAPI<ProjectsResponse | ProjectsListResponse>('/api/projects');
    return normalizeProjectsResponse(data);
  },

  async switchProject(projectId: string): Promise<void> {
    await fetchAPI(`/api/projects/${encodeURIComponent(projectId)}/switch`, {
      method: 'POST',
    });
  },

  async createProject(
    path: string,
    options?: { favorite?: boolean; color?: string; name?: string; description?: string | null }
  ): Promise<Project> {
    const data = await fetchAPI<ProjectMutationResponse>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ path, ...options }),
    });
    if (!data.project) {
      throw new Error('Project creation failed: missing project payload');
    }
    return adaptProject(data.project);
  },

  async updateProject(
    projectId: string,
    updates: Partial<Pick<Project, 'name' | 'color' | 'favorite' | 'description'>>
  ): Promise<Project | undefined> {
    const data = await fetchAPI<ProjectMutationResponse>(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return data.project ? adaptProject(data.project) : undefined;
  },

  async deleteProject(projectId: string): Promise<void> {
    await fetchAPI(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
    });
  },

  async validateProject(projectId: string): Promise<ProjectValidationResponse> {
    return fetchAPI<ProjectValidationResponse>(`/api/projects/${encodeURIComponent(projectId)}/validate`, {
      method: 'POST',
    });
  },

  async getProjectStats(projectId: string): Promise<Stats> {
    const data = await fetchAPI<ProjectStatsResponse | RustStats>(
      `/api/projects/${encodeURIComponent(projectId)}/stats`
    );
    const statsPayload = 'stats' in data ? data.stats : data;
    return adaptStats(statsPayload as RustStats);
  },

  async getContextFiles(): Promise<ContextFileListItem[]> {
    const data = await fetchAPI<ContextFileListResponse>('/api/context');
    return (data.files || []).map(adaptContextFileListItem);
  },

  async getContextFile(path: string): Promise<ContextFileContent> {
    const safePath = encodeURIComponent(path);
    const data = await fetchAPI<ContextFileListItem & { content: string; fileType?: string | null }>(
      `/api/context/${safePath}`
    );
    return adaptContextFileContent(data);
  },

  async listDirectory(path = ''): Promise<DirectoryListResponse> {
    return fetchAPI<DirectoryListResponse>('/api/local-projects/list-directory', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  },
};

// Re-export types for convenience
export type {
  DependencyGraph,
  ProjectsResponse,
  ProjectsListResponse,
  ProjectValidationResponse,
  DirectoryListResponse,
  ContextFileListItem,
  ContextFileListResponse,
  ContextFileContent,
};
