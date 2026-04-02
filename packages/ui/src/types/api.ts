import type {
  LightweightSpec as UiLightweightSpec,
  SpecRelationships as UiSpecRelationships,
  SpecWithMetadata as UiSpecWithMetadata,
  SubSpec as UiSubSpec,
} from './specs';
import type {
  SessionMode as GeneratedSessionMode,
  SessionStatus as GeneratedSessionStatus,
  SpecPriority as GeneratedSpecPriority,
  SpecStatus as GeneratedSpecStatus,
} from './generated';

export type SpecStatus = GeneratedSpecStatus;
export type SpecPriority = GeneratedSpecPriority;
export type TokenStatus = 'optimal' | 'good' | 'warning' | 'critical';
export type ValidationStatus = 'pass' | 'warn' | 'fail';

export type SessionStatus = GeneratedSessionStatus;
export type SessionMode = GeneratedSessionMode;
export type SessionProtocol = 'acp' | 'subprocess';

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
  specIds: string[];
  /** @deprecated Use specIds instead. Returns first spec ID for backward compatibility. */
  specId?: string | null;
  prompt?: string | null;
  runner: string;
  mode: SessionMode;
  protocol?: SessionProtocol | null;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string | null;
  durationMs?: number | null;
  tokenCount?: number | null;
  activeToolCall?: {
    id?: string;
    tool: string;
    status: 'running' | 'completed' | 'failed';
  } | null;
  planProgress?: {
    completed: number;
    total: number;
  } | null;
}

export type RunnerSource = 'builtin' | 'global' | 'project';

export interface RunnerDefinition {
  id: string;
  name?: string | null;
  command?: string | null;
  args: string[];
  env: Record<string, string>;
  model?: string | null;
  modelProviders?: string[] | null;
  /** 
   * True if command is available, false if not, undefined if validation pending.
   * When skipValidation=true on list request, this will be undefined.
   */
  available?: boolean;
  version?: string | null;
  source: RunnerSource;
}

export interface RunnerListResponse {
  default?: string | null;
  runners: RunnerDefinition[];
}

export interface RunnerValidateResponse {
  valid: boolean;
  error?: string | null;
}

export interface RunnerVersionResponse {
  version?: string | null;
}

export interface RunnerModelsResponse {
  models: string[];
}

export type RunnerScope = 'project' | 'global';

export interface SessionLog {
  id: number;
  timestamp: string;
  level: string;
  message: string;
}

export type AcpToolCallStatus = 'running' | 'completed' | 'failed';
export type AcpPlanEntryStatus = 'pending' | 'running' | 'done';

export type SessionStreamEvent =
  | { type: 'log'; timestamp: string; level: string; message: string }
  | {
    type: 'acp_message';
    timestamp?: string;
    role: 'agent' | 'user';
    content: string;
    done: boolean;
    contentBlocks?: unknown[];
    rawContent?: unknown;
  }
  | {
    type: 'acp_thought';
    timestamp?: string;
    content: string;
    done: boolean;
    contentBlocks?: unknown[];
    rawContent?: unknown;
  }
  | {
    type: 'acp_tool_call';
    timestamp?: string;
    id: string;
    tool: string;
    args: Record<string, unknown>;
    status: AcpToolCallStatus;
    result?: unknown;
    rawContent?: unknown;
  }
  | {
    type: 'acp_plan';
    timestamp?: string;
    entries: Array<{ id: string; title: string; status: AcpPlanEntryStatus }>;
    done?: boolean;
  }
  | {
    type: 'acp_permission_request';
    timestamp?: string;
    id: string;
    tool: string;
    args: Record<string, unknown>;
    options: string[];
  }
  | { type: 'acp_mode_update'; timestamp?: string; mode: string }
  | { type: 'complete'; status: string; duration_ms: number };

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
  source?: 'local' | 'git';
  git?: {
    remoteUrl: string;
    branch: string;
    specsPath: string;
    lastSynced?: string | null;
  } | null;
}

export interface ProjectsResponse {
  projects?: Project[];
  recentProjects?: string[];
  favoriteProjects?: string[];
}


export interface DetectedSpec {
  path: string;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
}

export interface GitDetectResult {
  remoteUrl?: string;
  repo?: string;
  branch: string;
  specsDir: string;
  specCount: number;
  specs: DetectedSpec[];
}

export interface GitImportResult {
  projectId: string;
  projectName: string;
  repo: string;
  branch: string;
  specsPath: string;
  syncedSpecs: number;
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
  draftStatus?: {
    enabled?: boolean;
  };
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
  limit?: number;
  offset?: number;
  cursor?: string;
  /** When true, server returns pre-built hierarchy tree for performance */
  hierarchy?: boolean;
}

export interface ListSpecsResponse {
  specs: Spec[];
  total: number;
  nextCursor?: string;
  projectId?: string;
  /** Pre-built hierarchy tree (only when hierarchy=true query param) */
  hierarchy?: HierarchyNode[];
}

/** Hierarchical node for tree view - pre-computed server-side for performance */
export interface HierarchyNode {
  // All Spec fields are flattened here
  id: string;
  specNumber?: number;
  specName: string;
  title?: string | null;
  status?: SpecStatus;
  priority?: SpecPriority;
  tags?: string[];
  parent?: string | null;
  children?: string[];
  dependsOn?: string[];
  requiredBy?: string[];
  tokenCount?: number;
  tokenStatus?: TokenStatus;
  validationStatus?: ValidationStatus;
  // Nested children
  childNodes: HierarchyNode[];
}

export interface SectionTokenCount {
  heading: string;
  tokens: number;
}

export interface DetailedBreakdown {
  codeBlocks: number;
  checklists: number;
  prose: number;
  sections: SectionTokenCount[];
}

export interface TokenBreakdown {
  frontmatter: number;
  content: number;
  title: number;
  detailed: DetailedBreakdown;
}

export interface SpecTokenResponse {
  tokenCount: number;
  tokenStatus: TokenStatus;
  tokenBreakdown: TokenBreakdown;
}

export interface SpecValidationError {
  severity: 'info' | 'warning' | 'error';
  message: string;
  line?: number;
  type: string;
  suggestion?: string | null;
}

export interface SpecValidationResponse {
  status: ValidationStatus;
  errors: SpecValidationError[];
}

/** Metadata for a single spec (tokens + validation) */
export interface SpecMetadata {
  tokenCount: number;
  tokenStatus: TokenStatus;
  validationStatus: ValidationStatus;
}

/** Batch metadata response - tokens and validation for multiple specs */
export interface BatchMetadataResponse {
  specs: Record<string, SpecMetadata>;
}

// ---------------------------------------------------------------------------
// Codebase file browsing (spec 246)
// ---------------------------------------------------------------------------

export type FileEntryType = 'file' | 'directory';

export interface FileEntry {
  name: string;
  type: FileEntryType;
  /** Size in bytes – only for files */
  size?: number;
  /** Whether this entry is ignored by .gitignore */
  ignored?: boolean;
}

export interface FileListResponse {
  path: string;
  entries: FileEntry[];
}

export interface FileContentResponse {
  path: string;
  content: string;
  language: string;
  size: number;
  lineCount: number;
}

export interface FileSearchEntry {
  name: string;
  path: string;
  type: FileEntryType;
  /** Size in bytes – only for files */
  size?: number;
  /** Whether this entry is ignored by .gitignore */
  ignored?: boolean;
}

export interface FileSearchResponse {
  query: string;
  results: FileSearchEntry[];
}

// Spec search types (backend search API)
export interface SpecSearchFilters {
  status?: string;
  priority?: string;
  tags?: string[];
}

export interface SpecSearchResponse {
  results: Spec[];
  total: number;
  query: string;
  projectId?: string;
}
