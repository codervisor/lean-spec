/**
 * Spec-related TypeScript types
 * Framework-agnostic types for spec data structures
 */

/**
 * Valid spec status values
 */
export type SpecStatus = 'planned' | 'in-progress' | 'complete' | 'archived';

/**
 * Valid spec priority values
 */
export type SpecPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Spec relationship information
 */
export interface SpecRelationships {
  dependsOn: string[];
  requiredBy: string[];
}

/**
 * A node in a spec relationship graph
 */
export interface SpecRelationshipNode {
  specNumber?: number;
  specName: string;
  title?: string;
  status?: string;
  priority?: string;
}

/**
 * Complete spec relationships including current spec and its connections
 */
export interface CompleteSpecRelationships {
  current: SpecRelationshipNode;
  dependsOn: SpecRelationshipNode[];
  requiredBy: SpecRelationshipNode[];
}

/**
 * Lightweight spec for list views (no content for performance)
 */
export interface LightweightSpec {
  id: string;
  projectId?: string;
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
  filePath?: string;
  githubUrl?: string | null;
  dependsOn: string[];
  requiredBy: string[];
  subSpecsCount?: number;
}

/**
 * Full spec with all content
 */
export interface Spec extends LightweightSpec {
  contentMd: string;
  contentHtml?: string | null;
  syncedAt?: string;
}

/**
 * Sub-spec within a spec
 */
export interface SubSpec {
  name: string;
  filename: string;
  title: string | null;
  contentMd: string;
}

/**
 * Spec with metadata including sub-specs and relationships
 */
export interface SpecWithMetadata extends Spec {
  subSpecs?: SubSpec[];
  relationships?: SpecRelationships;
}

/**
 * Sidebar-optimized spec type
 */
export type SidebarSpec = Pick<
  LightweightSpec,
  'id' | 'specNumber' | 'title' | 'specName' | 'status' | 'priority' | 'updatedAt'
> & {
  tags: string[] | null;
  subSpecsCount?: number;
};

/**
 * Statistics result for a project
 */
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

/**
 * Dependency graph node
 */
export interface DependencyNode {
  id: string;
  name: string;
  number: number;
  status: string;
  priority: string;
  tags: string[];
}

/**
 * Dependency graph edge
 */
export interface DependencyEdge {
  source: string;
  target: string;
  type: 'dependsOn';
}

/**
 * Complete dependency graph
 */
export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

/**
 * Dependencies for a specific spec
 */
export interface SpecDependencies {
  dependsOn: DependencyInfo[];
  requiredBy: DependencyInfo[];
}

/**
 * Information about a dependency
 */
export interface DependencyInfo {
  specName: string;
  title: string | null;
  status: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  specName: string;
  valid: boolean;
  issues: ValidationIssue[];
}

/**
 * Validation issue
 */
export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  line: number | null;
}
