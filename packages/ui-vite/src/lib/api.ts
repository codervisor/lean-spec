// API client for connecting to Rust HTTP server

import { getBackend } from './backend-adapter';
import type {
  ContextFileContent,
  ContextFileListItem,
  ContextFileListResponse,
  DependencyGraph,
  DirectoryListResponse,
  NextJsSpec,
  NextJsSpecDetail,
  NextJsStats,
  Project as ProjectType,
  ProjectValidationResponse,
  ProjectsListResponse,
  ProjectsResponse,
  RustSpec,
  RustSpecDetail,
  RustStats,
  SearchResponse,
  SubSpecItem,
} from '../types/api';

export type Spec = NextJsSpec;
export type SpecDetail = NextJsSpecDetail;
export type Stats = NextJsStats;
export type Project = ProjectType;

export class APIError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'APIError';
  }
}

function toDateOrNull(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function estimateTokenCount(content: string): number {
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
  const created = rustSpec.createdAt;
  const updated = rustSpec.updatedAt;
  const completed = rustSpec.completedAt;

  return {
    id: rustSpec.id || rustSpec.specName,
    name: rustSpec.specName,
    specNumber: rustSpec.specNumber ?? extractSpecNumber(rustSpec.specName),
    specName: rustSpec.specName,
    title: rustSpec.title ?? null,
    status: rustSpec.status ?? null,
    priority: rustSpec.priority ?? null,
    tags: rustSpec.tags ?? null,
    assignee: rustSpec.assignee ?? null,
    createdAt: toDateOrNull(created),
    updatedAt: toDateOrNull(updated),
    completedAt: toDateOrNull(completed),
    filePath: rustSpec.filePath,
    relationships: rustSpec.relationships
      ? {
        depends_on: rustSpec.relationships.dependsOn,
        required_by: rustSpec.relationships.requiredBy,
      }
      : undefined,
  };
}

export function adaptSpecDetail(rustSpec: RustSpecDetail): NextJsSpecDetail {
  const content = rustSpec.contentMd ?? rustSpec.content ?? '';
  const dependsOn = rustSpec.dependsOn ?? [];
  const requiredBy = rustSpec.requiredBy ?? [];

  const rawSubSpecs = rustSpec.subSpecs as unknown;
  const subSpecs: SubSpecItem[] = Array.isArray(rawSubSpecs)
    ? rawSubSpecs.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const candidate = entry as Partial<SubSpecItem> & Record<string, unknown>;
      const name = typeof candidate.name === 'string' ? candidate.name : undefined;
      const subContent = typeof candidate.content === 'string' ? candidate.content : undefined;
      if (!name || !subContent) return [];

      const file = typeof candidate.file === 'string' ? candidate.file : name;
      const iconName = typeof candidate.iconName === 'string'
        ? candidate.iconName
        : typeof candidate.icon_name === 'string'
          ? (candidate.icon_name as string)
          : undefined;
      const color = typeof candidate.color === 'string' ? candidate.color : undefined;

      return [{ name, file, iconName, color, content: subContent } satisfies SubSpecItem];
    })
    : [];

  return {
    ...adaptSpec(rustSpec),
    content,
    dependsOn,
    requiredBy,
    subSpecs: subSpecs.length > 0 ? subSpecs : undefined,
  };
}

export function adaptStats(rustStats: RustStats): NextJsStats {
  return {
    totalSpecs: rustStats.totalSpecs,
    completionRate: rustStats.completionRate,
    specsByStatus: rustStats.specsByStatus,
    specsByPriority: rustStats.specsByPriority,
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

export type SearchResult = Omit<SearchResponse, 'results'> & { results: Spec[] };

export const api = getBackend();
export { getBackend } from './backend-adapter';

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
