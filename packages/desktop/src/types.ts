export interface DesktopWindowPreferences {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized: boolean;
}

export interface DesktopBehaviorPreferences {
  startMinimized: boolean;
  minimizeToTray: boolean;
  launchAtLogin: boolean;
}

export interface DesktopShortcutConfig {
  toggleWindow: string;
  quickSwitcher: string;
  newSpec: string;
}

export interface DesktopUpdatesConfig {
  autoCheck: boolean;
  autoInstall: boolean;
  channel: 'stable' | 'beta';
}

export interface DesktopAppearanceConfig {
  theme: 'light' | 'dark' | 'system';
}

export interface DesktopConfig {
  window: DesktopWindowPreferences;
  behavior: DesktopBehaviorPreferences;
  shortcuts: DesktopShortcutConfig;
  updates: DesktopUpdatesConfig;
  appearance: DesktopAppearanceConfig;
}

export interface DesktopProject {
  id: string;
  name: string;
  path: string;
  specsDir: string;
  lastAccessed: string;
  favorite: boolean;
  color?: string;
  description?: string;
}

export interface DesktopBootstrapPayload {
  activeProjectId?: string;
  config: DesktopConfig;
  projects: DesktopProject[];
}

// ============================================================================
// Spec Types (Phase 4 of spec 169 - Native Tauri API)
// ============================================================================

/** A full spec with all content */
export interface Spec {
  id: string;
  projectId: string;
  specNumber: number | null;
  specName: string;
  title: string | null;
  status: string;
  priority: string | null;
  tags: string[];
  assignee: string | null;
  contentMd: string;
  contentHtml: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  filePath: string;
  githubUrl: string | null;
  syncedAt: string;
  dependsOn: string[];
  requiredBy: string[];
}

/** Lightweight spec without full content (for list views) */
export interface LightweightSpec {
  id: string;
  projectId: string;
  specNumber: number | null;
  specName: string;
  title: string | null;
  status: string;
  priority: string | null;
  tags: string[];
  assignee: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  filePath: string;
  githubUrl: string | null;
  dependsOn: string[];
  requiredBy: string[];
  subSpecsCount: number;
}

/** Statistics result for a project */
export interface StatsResult {
  totalProjects: number;
  totalSpecs: number;
  specsByStatus: { status: string; count: number }[];
  specsByPriority: { priority: string; count: number }[];
  completionRate: number;
  activeSpecs: number;
  totalTags: number;
  avgTagsPerSpec: number;
  specsWithDependencies: number;
}

/** Dependency graph node */
export interface DependencyNode {
  id: string;
  name: string;
  number: number;
  status: string;
  priority: string;
  tags: string[];
}

/** Dependency graph edge */
export interface DependencyEdge {
  source: string;
  target: string;
  type: 'dependsOn';
}

/** Complete dependency graph */
export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

/** Dependencies for a specific spec */
export interface SpecDependencies {
  dependsOn: DependencyInfo[];
  requiredBy: DependencyInfo[];
}

/** Information about a dependency */
export interface DependencyInfo {
  specName: string;
  title: string | null;
  status: string;
}

/** Validation result */
export interface ValidationResult {
  specName: string;
  valid: boolean;
  issues: ValidationIssue[];
}

/** Validation issue */
export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  line: number | null;
}
