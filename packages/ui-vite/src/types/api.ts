export type SpecStatus = 'planned' | 'in-progress' | 'complete' | 'archived';
export type SpecPriority = 'low' | 'medium' | 'high' | 'critical';

export interface RustSpec {
  name: string;
  title: string;
  status: SpecStatus;
  priority?: SpecPriority;
  tags?: string[];
  created?: string;
  updated?: string;
  depends_on?: string[];
  required_by?: string[];
}

export interface RustSpecDetail extends RustSpec {
  content: string;
  metadata?: {
    created_at?: string;
    updated_at?: string;
    assignee?: string;
    github_url?: string;
    [key: string]: unknown;
  };
}

export interface RustStats {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_tag: Record<string, number>;
}

export interface NextJsSpec {
  id: string;
  name: string;
  specNumber: number | null;
  specName: string;
  title: string | null;
  status: SpecStatus | null;
  priority: SpecPriority | null;
  tags: string[] | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface NextJsSpecDetail extends NextJsSpec {
  content: string;
  metadata: {
    created_at?: string;
    updated_at?: string;
    assignee?: string;
    github_url?: string;
    [key: string]: unknown;
  };
  dependsOn?: string[];
  requiredBy?: string[];
}

export interface NextJsStats {
  totalSpecs: number;
  completionRate: number;
  specsByStatus: { status: string; count: number }[];
  byPriority?: Record<string, number>;
  byTag?: Record<string, number>;
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
  name?: string;
  displayName?: string;
  path?: string;
  specsDir?: string;
  favorite?: boolean;
  color?: string | null;
  description?: string | null;
  isFeatured?: boolean;
  lastAccessed?: string | Date | null;
  githubOwner?: string;
  githubRepo?: string;
}

export interface ProjectsResponse {
  current: Project | null;
  available: Project[];
  projects?: Project[];
}

// Axum HTTP server returns { projects, current_project_id } instead of { current, available }
// so we normalize both shapes for the UI layer.
export interface ProjectsListResponse {
  projects?: Project[];
  current_project_id?: string | null;
  currentProjectId?: string | null;
  current?: Project | null;
  available?: Project[];
  mode?: 'single-project' | 'multi-project';
  recentProjects?: string[];
  favoriteProjects?: string[];
}

export interface ProjectMutationResponse {
  project?: Project;
  favorite?: boolean;
}

export interface ProjectValidationResult {
  isValid: boolean;
  error?: string | null;
}

export interface ProjectValidationResponse {
  validation: ProjectValidationResult;
}

export interface ProjectStatsResponse {
  stats: RustStats;
}

export interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
}

export interface DirectoryListResponse {
  items: DirectoryItem[];
  path: string;
}

export interface ListParams {
  status?: string;
  priority?: string;
  tag?: string;
  search?: string;
}
