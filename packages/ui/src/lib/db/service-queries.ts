/**
 * Service-based data access functions
 * These replace direct database queries with the unified specs service
 */

import { specsService } from '../specs/service';
import type { Spec } from './schema';
import type { ContextFile, ProjectContext, LeanSpecConfig } from '../specs/types';
import { detectSubSpecs } from '../sub-specs';
import { join, resolve, dirname } from 'path';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import matter from 'gray-matter';

/**
 * Spec with parsed tags (for client consumption)
 */
export type ParsedSpec = Omit<Spec, 'tags'> & {
  tags: string[] | null;
};

/**
 * Lightweight spec for list views (excludes contentMd to reduce payload size)
 * The full contentMd can be 1MB+ for all specs combined
 */
export type LightweightSpec = Omit<ParsedSpec, 'contentMd' | 'contentHtml'>;

/**
 * Strip contentMd from a spec to create a lightweight version
 */
function toLightweightSpec<T extends ParsedSpec>(spec: T): Omit<T, 'contentMd' | 'contentHtml'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { contentMd, contentHtml, ...rest } = spec;
  return rest;
}

const DEFAULT_SPECS_DIR = resolve(process.cwd(), '../../specs');

function getSpecsRootDir(): string {
  const envDir = process.env.SPECS_DIR;
  if (!envDir) {
    return DEFAULT_SPECS_DIR;
  }
  return envDir.startsWith('/') ? envDir : resolve(process.cwd(), envDir);
}

function buildSpecDirPath(filePath: string): string {
  const normalized = filePath
    .replace(/^specs\//, '')
    .replace(/\/README\.md$/, '');
  return join(getSpecsRootDir(), normalized);
}

interface SpecRelationships {
  dependsOn: string[];
  requiredBy: string[];
}
function normalizeRelationshipList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [];
}

function getFilesystemRelationships(specDirPath: string): SpecRelationships {
  try {
    const readmePath = join(specDirPath, 'README.md');
    const raw = readFileSync(readmePath, 'utf-8');
    const { data } = matter(raw);
    const dependsOn = normalizeRelationshipList(data?.depends_on ?? data?.dependsOn);
    // Note: requiredBy is computed from the dependency graph, not stored in frontmatter
    return {
      dependsOn,
      requiredBy: [],
    };
  } catch (error) {
    console.warn('Unable to parse spec relationships', error);
    return { dependsOn: [], requiredBy: [] };
  }
}

/**
 * Parse tags from JSON string to array and strip frontmatter from contentMd
 */
function parseSpecTags(spec: Spec): ParsedSpec {
  // Strip frontmatter from contentMd if present
  let contentMd = spec.contentMd;
  if (contentMd.startsWith('---')) {
    try {
      const { content } = matter(contentMd);
      contentMd = content;
    } catch {
      // If parsing fails, use original content
    }
  }
  
  return {
    ...spec,
    contentMd,
    tags: spec.tags ? (typeof spec.tags === 'string' ? JSON.parse(spec.tags) : spec.tags) : null,
  };
}

/**
 * Count sub-specs in a directory
 */
function countSubSpecs(specDirPath: string): number {
  try {
    if (!existsSync(specDirPath)) return 0;
    
    const entries = readdirSync(specDirPath);
    let count = 0;
    
    for (const entry of entries) {
      // Skip README.md (main spec file) and non-.md files
      if (entry === 'README.md' || !entry.endsWith('.md')) {
        continue;
      }
      
      const filePath = join(specDirPath, entry);
      try {
        const stat = statSync(filePath);
        if (stat.isFile()) {
          count++;
        }
      } catch {
        // Skip files that can't be accessed
      }
    }
    
    return count;
  } catch {
    return 0;
  }
}

/**
 * Get all specs (uses filesystem by default, database if projectId provided)
 * Returns lightweight specs without contentMd for list views
 */
export async function getSpecs(projectId?: string): Promise<LightweightSpec[]> {
  const specs = await specsService.getAllSpecs(projectId);
  return specs.map(spec => toLightweightSpec(parseSpecTags(spec)));
}

/**
 * Get all specs with sub-spec count (for sidebar)
 * Returns lightweight specs without contentMd
 */
export async function getSpecsWithSubSpecCount(projectId?: string): Promise<(LightweightSpec & { subSpecsCount: number })[]> {
  const specs = await specsService.getAllSpecs(projectId);
  
  // Only count sub-specs for filesystem mode
  if (projectId) {
    return specs.map(spec => ({ ...toLightweightSpec(parseSpecTags(spec)), subSpecsCount: 0 }));
  }
  
  return specs.map(spec => {
    const specDirPath = buildSpecDirPath(spec.filePath);
    const subSpecsCount = countSubSpecs(specDirPath);
    return { ...toLightweightSpec(parseSpecTags(spec)), subSpecsCount };
  });
}

/**
 * Extract relationships from spec content (contentMd contains frontmatter)
 * Used for multi-project mode where we can't read from filesystem
 */
function getRelationshipsFromContent(contentMd: string): SpecRelationships {
  try {
    const { data } = matter(contentMd);
    const dependsOn = normalizeRelationshipList(data?.depends_on ?? data?.dependsOn);
    return {
      dependsOn,
      requiredBy: [],
    };
  } catch (error) {
    console.warn('Unable to parse spec relationships from content', error);
    return { dependsOn: [], requiredBy: [] };
  }
}

/**
 * Get all specs with sub-spec count and relationships (for comprehensive list view)
 * Builds the full dependency graph to compute requiredBy (reverse dependencies)
 * Returns lightweight specs without contentMd
 */
export async function getSpecsWithMetadata(projectId?: string): Promise<(LightweightSpec & { subSpecsCount: number; relationships: SpecRelationships })[]> {
  const specs = await specsService.getAllSpecs(projectId);
  
  // First pass: collect all dependsOn relationships
  const specRelationshipsMap = new Map<string, { dependsOn: string[]; requiredBy: string[] }>();
  
  for (const spec of specs) {
    // For multi-project mode, extract from contentMd; for filesystem mode, read from disk
    const { dependsOn } = projectId 
      ? getRelationshipsFromContent(spec.contentMd)
      : getFilesystemRelationships(buildSpecDirPath(spec.filePath));
    specRelationshipsMap.set(spec.specName, { dependsOn, requiredBy: [] });
  }
  
  // Second pass: compute requiredBy (reverse lookup)
  for (const [specName, rels] of specRelationshipsMap.entries()) {
    for (const dep of rels.dependsOn) {
      const depRels = specRelationshipsMap.get(dep);
      if (depRels) {
        depRels.requiredBy.push(specName);
      }
    }
  }
  
  return specs.map(spec => {
    // Sub-specs count only available in filesystem mode
    const subSpecsCount = projectId ? 0 : countSubSpecs(buildSpecDirPath(spec.filePath));
    const relationships = specRelationshipsMap.get(spec.specName) || { dependsOn: [], requiredBy: [] };
    return { ...toLightweightSpec(parseSpecTags(spec)), subSpecsCount, relationships };
  });
}

/**
 * Get a spec by ID (number or UUID)
 * Computes requiredBy by scanning all specs for reverse dependencies
 */
export async function getSpecById(id: string, projectId?: string): Promise<(ParsedSpec & { subSpecs?: import('../sub-specs').SubSpec[]; relationships?: SpecRelationships }) | null> {
  const spec = await specsService.getSpec(id, projectId);

  if (!spec) return null;

  const parsedSpec = parseSpecTags(spec);

  // Detect sub-specs from filesystem (only for filesystem mode)
  if (!projectId) {
    const specDirPath = buildSpecDirPath(spec.filePath);
    const subSpecs = detectSubSpecs(specDirPath);
    const { dependsOn } = getFilesystemRelationships(specDirPath);
    
    // Compute requiredBy by scanning all specs
    const allSpecs = await specsService.getAllSpecs();
    const requiredBy: string[] = [];
    
    for (const otherSpec of allSpecs) {
      if (otherSpec.specName === spec.specName) continue;
      const otherSpecDirPath = buildSpecDirPath(otherSpec.filePath);
      const otherRels = getFilesystemRelationships(otherSpecDirPath);
      if (otherRels.dependsOn.includes(spec.specName)) {
        requiredBy.push(otherSpec.specName);
      }
    }
    
    return { ...parsedSpec, subSpecs, relationships: { dependsOn, requiredBy } };
  }

  // Multi-project mode: extract relationships from spec content and compute requiredBy
  const { dependsOn } = getRelationshipsFromContent(spec.contentMd);
  
  // Compute requiredBy by scanning all specs in the project
  const allSpecs = await specsService.getAllSpecs(projectId);
  const requiredBy: string[] = [];
  
  for (const otherSpec of allSpecs) {
    if (otherSpec.specName === spec.specName) continue;
    const otherRels = getRelationshipsFromContent(otherSpec.contentMd);
    if (otherRels.dependsOn.includes(spec.specName)) {
      requiredBy.push(otherSpec.specName);
    }
  }

  return { ...parsedSpec, relationships: { dependsOn, requiredBy } };
}

/**
 * Get specs by status
 * Returns lightweight specs without contentMd
 */
export async function getSpecsByStatus(
  status: 'planned' | 'in-progress' | 'complete' | 'archived',
  projectId?: string
): Promise<LightweightSpec[]> {
  const specs = await specsService.getSpecsByStatus(status, projectId);
  return specs.map(spec => toLightweightSpec(parseSpecTags(spec)));
}

/**
 * Search specs
 * Returns lightweight specs without contentMd (search happens server-side)
 */
export async function searchSpecs(query: string, projectId?: string): Promise<LightweightSpec[]> {
  const specs = await specsService.searchSpecs(query, projectId);
  return specs.map(spec => toLightweightSpec(parseSpecTags(spec)));
}

/**
 * Stats calculation
 */
export interface StatsResult {
  totalProjects: number;
  totalSpecs: number;
  specsByStatus: { status: string; count: number }[];
  specsByPriority: { priority: string; count: number }[];
  completionRate: number;
}

export async function getStats(projectId?: string): Promise<StatsResult> {
  const specs = await specsService.getAllSpecs(projectId);

  // Count by status
  const statusCounts = new Map<string, number>();
  const priorityCounts = new Map<string, number>();

  for (const spec of specs) {
    if (spec.status) {
      statusCounts.set(spec.status, (statusCounts.get(spec.status) || 0) + 1);
    }
    if (spec.priority) {
      priorityCounts.set(spec.priority, (priorityCounts.get(spec.priority) || 0) + 1);
    }
  }

  const completeCount = statusCounts.get('complete') || 0;
  const completionRate = specs.length > 0 ? (completeCount / specs.length) * 100 : 0;

  return {
    totalProjects: 1, // For now, single project (LeanSpec)
    totalSpecs: specs.length,
    specsByStatus: Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count })),
    specsByPriority: Array.from(priorityCounts.entries()).map(([priority, count]) => ({ priority, count })),
    completionRate: Math.round(completionRate * 10) / 10,
  };
}

/**
 * Get all unique tags from specs in a project
 * Returns sorted array of unique tag strings
 */
export async function getAllTags(projectId?: string): Promise<string[]> {
  const specs = await specsService.getAllSpecs(projectId);
  const tagSet = new Set<string>();
  
  for (const spec of specs) {
    const parsedSpec = parseSpecTags(spec);
    if (parsedSpec.tags && Array.isArray(parsedSpec.tags)) {
      for (const tag of parsedSpec.tags) {
        tagSet.add(tag);
      }
    }
  }
  
  return Array.from(tagSet).sort();
}

// ============================================================================
// Project Context Functions (Spec 131)
// ============================================================================

/**
 * Get the project root directory (parent of specs directory)
 */
function getProjectRootDir(): string {
  const specsDir = getSpecsRootDir();
  return dirname(specsDir);
}

/**
 * Simple token estimation (approximation without tiktoken for browser compatibility)
 * Uses the common heuristic of ~4 characters per token for English text
 */
function estimateTokens(text: string): number {
  // More accurate estimation:
  // - Count words (roughly 1.3 tokens per word for English)
  // - Account for punctuation and special characters
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  const specialChars = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;
  return Math.ceil(words * 1.3 + specialChars * 0.5);
}

/**
 * Read a context file and return its metadata
 */
function readContextFile(filePath: string, projectRoot: string): ContextFile | null {
  try {
    if (!existsSync(filePath)) return null;
    
    const stats = statSync(filePath);
    const content = readFileSync(filePath, 'utf-8');
    const relativePath = filePath.replace(projectRoot + '/', '');
    
    return {
      name: relativePath.split('/').pop() || relativePath,
      path: relativePath,
      content,
      tokenCount: estimateTokens(content),
      lastModified: stats.mtime,
    };
  } catch (error) {
    console.warn(`Unable to read context file: ${filePath}`, error);
    return null;
  }
}

/**
 * Get agent instruction files (AGENTS.md, GEMINI.md, etc.)
 */
export async function getAgentInstructions(projectRootOverride?: string): Promise<ContextFile[]> {
  const projectRoot = projectRootOverride || getProjectRootDir();
  const files: ContextFile[] = [];
  
  // Primary agent instruction files in root
  const rootAgentFiles = [
    'AGENTS.md',
    'GEMINI.md',
    'CLAUDE.md',
    'COPILOT.md',
  ];
  
  for (const fileName of rootAgentFiles) {
    const file = readContextFile(join(projectRoot, fileName), projectRoot);
    if (file) files.push(file);
  }
  
  // Check .github/copilot-instructions.md
  const copilotInstructions = readContextFile(
    join(projectRoot, '.github', 'copilot-instructions.md'),
    projectRoot
  );
  if (copilotInstructions) files.push(copilotInstructions);
  
  // Check docs/agents/*.md
  const agentsDocsDir = join(projectRoot, 'docs', 'agents');
  if (existsSync(agentsDocsDir)) {
    try {
      const entries = readdirSync(agentsDocsDir);
      for (const entry of entries) {
        if (entry.endsWith('.md')) {
          const file = readContextFile(join(agentsDocsDir, entry), projectRoot);
          if (file) files.push(file);
        }
      }
    } catch {
      // Directory might not be accessible
    }
  }
  
  return files;
}

/**
 * Get LeanSpec configuration
 */
export async function getProjectConfig(projectRootOverride?: string): Promise<{ file: ContextFile | null; parsed: LeanSpecConfig | null }> {
  const projectRoot = projectRootOverride || getProjectRootDir();
  const configPath = join(projectRoot, '.lean-spec', 'config.json');
  
  const file = readContextFile(configPath, projectRoot);
  
  if (!file) {
    return { file: null, parsed: null };
  }
  
  try {
    const parsed = JSON.parse(file.content) as LeanSpecConfig;
    return { file, parsed };
  } catch {
    return { file, parsed: null };
  }
}

/**
 * Get project documentation files (README, CONTRIBUTING, etc.)
 */
export async function getProjectDocs(projectRootOverride?: string): Promise<ContextFile[]> {
  const projectRoot = projectRootOverride || getProjectRootDir();
  const files: ContextFile[] = [];
  
  const docFiles = [
    'README.md',
    'CONTRIBUTING.md',
    'CHANGELOG.md',
  ];
  
  for (const fileName of docFiles) {
    const file = readContextFile(join(projectRoot, fileName), projectRoot);
    if (file) files.push(file);
  }
  
  return files;
}

/**
 * Get complete project context
 */
export async function getProjectContext(projectRootOverride?: string): Promise<ProjectContext> {
  const projectRoot = projectRootOverride || getProjectRootDir();
  const [agentInstructions, config, projectDocs] = await Promise.all([
    getAgentInstructions(projectRoot),
    getProjectConfig(projectRoot),
    getProjectDocs(projectRoot),
  ]);
  
  // Calculate total tokens
  let totalTokens = 0;
  for (const file of agentInstructions) {
    totalTokens += file.tokenCount;
  }
  if (config.file) {
    totalTokens += config.file.tokenCount;
  }
  for (const file of projectDocs) {
    totalTokens += file.tokenCount;
  }
  
  return {
    agentInstructions,
    config,
    projectDocs,
    totalTokens,
    projectRoot,
  };
}

/**
 * Dependency graph types for visualization
 */
export interface DependencyGraph {
  nodes: Array<{
    id: string;
    name: string;
    number: number;
    status: string;
    priority: string;
    tags: string[];
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: 'dependsOn';
  }>;
}

/**
 * Build dependency graph for visualization
 * Called directly from server components to avoid fetch issues with custom ports
 */
export async function getDependencyGraph(projectId?: string): Promise<DependencyGraph> {
  const specs = await getSpecsWithMetadata(projectId);
  
  const nodes = specs
    .filter(spec => spec.specNumber !== null)
    .map(spec => ({
      id: spec.id,
      name: spec.title || spec.specName || `Spec ${spec.specNumber}`,
      number: spec.specNumber!,
      status: spec.status || 'planned',
      priority: spec.priority || 'medium',
      tags: spec.tags || [],
    }));

  const edges: DependencyGraph['edges'] = [];
  const specIdByFolder = new Map<string, string>();
  
  specs.forEach(spec => {
    if (spec.specNumber !== null) {
      const folderName = spec.filePath
        .replace(/^specs\//, '')
        .replace(/\/README\.md$/, '');
      specIdByFolder.set(folderName, spec.id);
      
      const paddedNumber = spec.specNumber.toString().padStart(3, '0');
      specIdByFolder.set(paddedNumber, spec.id);
      specIdByFolder.set(spec.specNumber.toString(), spec.id);
    }
  });

  specs.forEach(spec => {
    if (!spec.specNumber) return;
    
    // Only process dependsOn relationships (no related)
    spec.relationships.dependsOn.forEach(dep => {
      const depTrimmed = dep.trim();
      const match = depTrimmed.match(/^(\d+)/);
      const targetId = match 
        ? specIdByFolder.get(match[1]) || specIdByFolder.get(match[1].padStart(3, '0'))
        : specIdByFolder.get(depTrimmed);
      
      if (targetId && targetId !== spec.id) {
        edges.push({
          source: targetId,
          target: spec.id,
          type: 'dependsOn',
        });
      }
    });
  });

  return { nodes, edges };
}
