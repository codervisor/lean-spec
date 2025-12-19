// API client for connecting to Rust HTTP server

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export interface Spec {
  name: string;
  title: string;
  status: 'planned' | 'in-progress' | 'complete' | 'archived';
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  created?: string;
  updated?: string;
  depends_on?: string[];
  required_by?: string[];
}

export interface SpecDetail extends Spec {
  content: string;
  metadata: {
    created_at?: string;
    updated_at?: string;
    assignee?: string;
    [key: string]: any;
  };
}

export interface Stats {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_tag: Record<string, number>;
}

export interface DependencyNode {
  id: string;
  name: string;
  status: string;
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: 'depends_on' | 'required_by';
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface Project {
  id: string;
  name: string;
  path: string;
}

export interface ProjectsResponse {
  current: Project | null;
  available: Project[];
}

// Axum HTTP server returns { projects, current_project_id } instead of { current, available }
// so we normalize both shapes for the UI layer.
export interface ProjectsListResponse {
  projects?: Project[];
  current_project_id?: string | null;
  currentProjectId?: string | null;
  current?: Project | null;
  available?: Project[];
}

export function normalizeProjectsResponse(
  data: ProjectsResponse | ProjectsListResponse
): ProjectsResponse {
  if ('projects' in data) {
    const projects = data.projects || [];
    const currentId = data.current_project_id || data.currentProjectId || null;
    const current = currentId
      ? projects.find((project) => project.id === currentId) || null
      : null;

    return {
      current,
      available: projects,
    };
  }

  return {
    current: data.current || null,
    available: data.available || [],
  };
}

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

  return response.json();
}

export const api = {
  async getSpecs(): Promise<Spec[]> {
    const data = await fetchAPI<{ specs: Spec[] }>('/api/specs');
    return data.specs;
  },

  async getSpec(name: string): Promise<SpecDetail> {
    const data = await fetchAPI<{ spec: SpecDetail }>(`/api/specs/${encodeURIComponent(name)}`);
    return data.spec;
  },

  async getStats(): Promise<Stats> {
    const data = await fetchAPI<{ stats: Stats }>('/api/stats');
    return data.stats;
  },

  async getDependencies(specName?: string): Promise<DependencyGraph> {
    const endpoint = specName 
      ? `/api/specs/${encodeURIComponent(specName)}/dependencies`
      : '/api/dependencies';
    const data = await fetchAPI<{ graph: DependencyGraph }>(endpoint);
    return data.graph;
  },

  async updateSpec(name: string, updates: Partial<Spec>): Promise<void> {
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
};
