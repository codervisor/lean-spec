// API client utilities and adapter exports

import { getBackend } from './backend-adapter';
import type {
  ContextFileContent,
  ContextFileListItem,
  ContextFileListResponse,
  DependencyGraph,
  DirectoryListResponse,
  Project as ProjectType,
  ProjectValidationResponse,
  ProjectsListResponse,
  ProjectsResponse,
  SearchResponse,
  Spec,
  SpecDetail,
  Stats,
  SubSpecItem,
} from '../types/api';

export type Project = ProjectType;

export class APIError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'APIError';
  }
}

export function parseDate(value?: string | Date | null): Date | null {
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

export function adaptSpec(rustSpec: Spec): Spec {
  const specNumber = rustSpec.specNumber ?? extractSpecNumber(rustSpec.specName);

  return {
    ...rustSpec,
    id: rustSpec.id || rustSpec.specName,
    specNumber: specNumber ?? null,
    title: rustSpec.title ?? rustSpec.specName ?? null,
    priority: rustSpec.priority ?? null,
    tags: rustSpec.tags ?? [],
    createdAt: rustSpec.createdAt ?? undefined,
    updatedAt: rustSpec.updatedAt ?? undefined,
    completedAt: rustSpec.completedAt ?? undefined,
    dependsOn: rustSpec.dependsOn ?? rustSpec.relationships?.dependsOn,
    requiredBy: rustSpec.requiredBy ?? rustSpec.relationships?.requiredBy,
  };
}

export function adaptSpecDetail(rustSpec: SpecDetail): SpecDetail {
  const content = rustSpec.contentMd ?? rustSpec.content ?? '';

  return {
    ...adaptSpec(rustSpec),
    content,
    contentMd: rustSpec.contentMd ?? rustSpec.content,
    metadata: rustSpec.metadata,
    dependsOn: rustSpec.dependsOn ?? rustSpec.relationships?.dependsOn ?? [],
    requiredBy: rustSpec.requiredBy ?? rustSpec.relationships?.requiredBy ?? [],
    subSpecs: normalizeSubSpecs(rustSpec.subSpecs),
  };
}

function normalizeSubSpecs(subSpecs?: SubSpecItem[] | unknown): SubSpecItem[] | undefined {
  if (!Array.isArray(subSpecs)) return undefined;

  const normalized = subSpecs.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const candidate = entry as Partial<SubSpecItem> & Record<string, unknown>;
    const name = typeof candidate.name === 'string' ? candidate.name : undefined;
    const content = typeof candidate.content === 'string' ? candidate.content : undefined;
    if (!name || !content) return [];

    const file = typeof candidate.file === 'string' ? candidate.file : name;
    const iconName =
      typeof candidate.iconName === 'string'
        ? candidate.iconName
        : typeof candidate.icon_name === 'string'
          ? (candidate.icon_name as string)
          : undefined;
    const color = typeof candidate.color === 'string' ? candidate.color : undefined;

    return [{ name, file, iconName, color, content } satisfies SubSpecItem];
  });

  return normalized.length > 0 ? normalized : undefined;
}

export function adaptStats(rustStats: Stats): Stats {
  return {
    ...rustStats,
    specsByPriority: rustStats.specsByPriority ?? [],
    specsByStatus: rustStats.specsByStatus ?? [],
  };
}

export function adaptContextFileListItem(item: ContextFileListItem): ContextFileListItem & { modifiedAt: Date | null } {
  return {
    ...item,
    modifiedAt: item.modified ? parseDate(item.modified) : null,
  };
}

export function adaptContextFileContent(
  response: ContextFileListItem & { content: string; fileType?: string | null }
): ContextFileContent {
  const modifiedAt = response.modified ? parseDate(response.modified) : null;
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
  Spec,
  SpecDetail,
  Stats,
  Project,
};
