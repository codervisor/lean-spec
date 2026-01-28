export type SpecStatus = 'planned' | 'in-progress' | 'complete' | 'archived';
export type SpecPriority = 'low' | 'medium' | 'high' | 'critical';

export type SessionStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type SessionMode = 'guided' | 'autonomous' | 'ralph';

export interface SubSpec {
  name: string;
  file: string;
  content: string;
  // Note: icon and color are assigned in frontend via getSubSpecStyle()
  // Backend no longer provides these fields
}

export interface Spec {
  id: string;
  specName: string;
  specNumber?: number | null;
  title?: string | null;
  content?: string;
  contentHash?: string;
  status: SpecStatus;
  priority?: SpecPriority | null;
  tags?: string[];
  assignee?: string | null;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  dependsOn?: string[];
  requiredBy?: string[];
  filePath?: string;
  relationships?: {
    dependsOn: string[];
    requiredBy?: string[];
  };
}

export interface SpecDetail extends Spec {
  contentMd?: string;
  content?: string;
  subSpecs?: SubSpec[];
  metadata?: Record<string, unknown>;
}

export interface Session {
  id: string;
  projectPath: string;
  specId?: string | null;
  tool: string;
  mode: SessionMode;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string | null;
  durationMs?: number | null;
  tokenCount?: number | null;
}

export interface SessionLog {
  id: number;
  timestamp: string;
  level: string;
  message: string;
}

export type MachineStatus = 'online' | 'offline';

export interface Machine {
  id: string;
  label: string;
  status: MachineStatus;
  lastSeen?: string;
  projectCount?: number;
}

export interface MachinesResponse {
  machines: Machine[];
}

export interface Stats {
  totalProjects: number;
  totalSpecs: number;
  specsByStatus: { status: string; count: number }[];
  specsByPriority: { priority: string; count: number }[];
  completionRate: number;
  projectId?: string;
}

export interface DependencyNode {
  id: string;
  name: string;
  number: number;
  status: string;
  priority: string;
  tags: string[];
}

export interface DependencyEdge {
  source: string;
  target: string;
  type?: 'depends_on' | 'required_by' | 'dependsOn';
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
  projects?: Project[];
  recentProjects?: string[];
  favoriteProjects?: string[];
}

export interface ProjectValidationResult {
  isValid: boolean;
  error?: string | null;
}

export interface ProjectValidationResponse {
  validation: ProjectValidationResult;
}

export interface ProjectStatsResponse {
  stats: Stats;
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

export interface ContextFileListItem {
  name: string;
  path: string;
  size: number;
  modified?: string | null;
  modifiedAt?: Date | null;
}

export interface ContextFileContent extends ContextFileListItem {
  content: string;
  fileType?: string | null;
  tokenCount: number;
  lineCount: number;
}

/**
 * Context file representation for project context visibility
 */
export interface ContextFile {
  name: string;
  path: string;
  content: string;
  tokenCount: number;
  lastModified: Date | string;
}

/**
 * LeanSpec configuration (from .lean-spec/config.json)
 */
export interface LeanSpecConfig {
  template?: string;
  specsDir?: string;
  structure?: {
    pattern?: string;
    prefix?: string;
    dateFormat?: string;
    sequenceDigits?: number;
    defaultFile?: string;
  };
  features?: {
    aiAgents?: boolean;
  };
  templates?: Record<string, string>;
}

/**
 * Project context containing all contextual files
 */
export interface ProjectContext {
  agentInstructions: ContextFile[];  // AGENTS.md, GEMINI.md, etc.
  config: {
    file: ContextFile | null;        // .lean-spec/config.json
    parsed: LeanSpecConfig | null;   // Parsed config object
  };
  projectDocs: ContextFile[];        // README.md, CONTRIBUTING.md, etc.
  totalTokens: number;
  projectRoot: string;               // Absolute path to project root (for editor links)
}

export interface ListParams {
  status?: string;
  priority?: string;
  tag?: string;
  search?: string;
}

export interface ListSpecsResponse {
  specs: Spec[];
  total: number;
  projectId?: string;
}
