import type {
  LightweightSpec as UiLightweightSpec,
  SpecRelationships as UiSpecRelationships,
  SpecPriority as UiSpecPriority,
  SpecStatus as UiSpecStatus,
  SpecWithMetadata as UiSpecWithMetadata,
  SubSpec as UiSubSpec,
} from '@leanspec/ui-components';

export type SpecStatus = UiSpecStatus;
export type SpecPriority = UiSpecPriority;
export type TokenStatus = 'optimal' | 'good' | 'warning' | 'critical';
export type ValidationStatus = 'pass' | 'warn' | 'fail';

export type SessionStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type SessionMode = 'guided' | 'autonomous' | 'ralph';

export type SubSpec = UiSubSpec & {
  file?: string;
  name?: string;
  content?: string;
};

export type Spec = UiLightweightSpec & {
  content?: string;
  contentMd?: string;
  contentHash?: string;
  tokenCount?: number;
  tokenStatus?: TokenStatus;
  validationStatus?: ValidationStatus;
  relationships?: UiSpecRelationships;
};

export type SpecDetail = UiSpecWithMetadata & {
  content?: string;
  contentHash?: string;
  tokenCount?: number;
  tokenStatus?: TokenStatus;
  validationStatus?: ValidationStatus;
  metadata?: Record<string, unknown>;
  subSpecs?: SubSpec[];
};

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

export interface SessionArchiveResult {
  path: string;
}

export interface SessionEvent {
  id: number;
  timestamp: string;
  eventType?: string;
  event_type?: string;
  data?: string | null;
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

export interface TokenBreakdown {
  frontmatter: number;
  content: number;
  title: number;
}

export interface SpecTokenResponse {
  tokenCount: number;
  tokenStatus: TokenStatus;
  tokenBreakdown: TokenBreakdown;
}

export interface SpecValidationIssue {
  severity: 'info' | 'warning' | 'error';
  message: string;
  line?: number;
  type: string;
  suggestion?: string | null;
}

export interface SpecValidationResponse {
  status: ValidationStatus;
  issues: SpecValidationIssue[];
}
