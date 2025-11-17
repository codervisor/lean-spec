import chalk from 'chalk';
import { Command } from 'commander';
import { getSpec, loadAllSpecs, type SpecInfo } from '../spec-loader.js';
import { autoCheckIfEnabled } from './check.js';
import { sanitizeUserInput } from '../utils/ui.js';
import { resolveSpecPath } from '../utils/path-helpers.js';
import { loadConfig } from '../config.js';
import * as path from 'node:path';
import { getStatusIndicator } from '../utils/colors.js';

export interface DepsOptions {
  depth?: number;
  graph?: boolean;
  json?: boolean;
}

export function depsCommand(): Command;
export function depsCommand(specPath: string, options?: DepsOptions): Promise<void>;
export function depsCommand(specPath?: string, options: DepsOptions = {}): Command | Promise<void> {
  if (typeof specPath === 'string') {
    return showDeps(specPath, options);
  }

  return new Command('deps')
    .description('Show dependency graph for a spec. Related specs (⟷) are shown bidirectionally, depends_on (→) are directional.')
    .argument('<spec>', 'Spec to show dependencies for')
    .option('--depth <n>', 'Show N levels deep (default: 3)', parseInt)
    .option('--graph', 'ASCII graph visualization')
    .option('--json', 'Output as JSON')
    .action(async (target: string, opts: DepsOptions) => {
      await showDeps(target, opts);
    });
}

export async function showDeps(specPath: string, options: DepsOptions = {}): Promise<void> {
  // Auto-check for conflicts before display
  await autoCheckIfEnabled();
  
  // Resolve spec path (handles numbers like "14" or "014")
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);
  const resolvedPath = await resolveSpecPath(specPath, cwd, specsDir);
  
  if (!resolvedPath) {
    throw new Error(`Spec not found: ${sanitizeUserInput(specPath)}`);
  }
  
  const spec = await getSpec(resolvedPath);
  
  if (!spec) {
    throw new Error(`Spec not found: ${sanitizeUserInput(specPath)}`);
  }

  // Load all specs to resolve dependencies
  const allSpecs = await loadAllSpecs({ includeArchived: true });
  const specMap = new Map<string, SpecInfo>();
  for (const s of allSpecs) {
    specMap.set(s.path, s);
  }

  // Find dependencies
  const dependsOn = findDependencies(spec, specMap);
  const blocks = findBlocking(spec, allSpecs);
  
  // Find related specs bidirectionally (merge both directions)
  const relatedSpecs = findAllRelated(spec, specMap, allSpecs);

  // Output as JSON if requested
  if (options.json) {
    const data = {
      spec: spec.path,
      dependsOn: dependsOn.map(s => ({ path: s.path, status: s.frontmatter.status })),
      blocks: blocks.map(s => ({ path: s.path, status: s.frontmatter.status })),
      related: relatedSpecs.map(s => ({ path: s.path, status: s.frontmatter.status })),
      chain: buildDependencyChain(spec, specMap, options.depth || 3),
    };
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // Display dependencies
  console.log('');
  console.log(chalk.green(`📦 Dependencies for ${chalk.cyan(sanitizeUserInput(spec.path))}`));
  console.log('');

  // Check if there are any relationships at all
  const hasAnyRelationships = dependsOn.length > 0 || blocks.length > 0 || relatedSpecs.length > 0;
  
  if (!hasAnyRelationships) {
    console.log(chalk.gray('  No dependencies or relationships'));
    console.log('');
    return;
  }

  // Depends On section
  if (dependsOn.length > 0) {
    console.log(chalk.bold('Depends On:'));
    for (const dep of dependsOn) {
      const status = getStatusIndicator(dep.frontmatter.status);
      console.log(`  → ${sanitizeUserInput(dep.path)} ${status}`);
    }
    console.log('');
  }

  // Required By section
  if (blocks.length > 0) {
    console.log(chalk.bold('Required By:'));
    for (const blocked of blocks) {
      const status = getStatusIndicator(blocked.frontmatter.status);
      console.log(`  ← ${sanitizeUserInput(blocked.path)} ${status}`);
    }
    console.log('');
  }

  // Related Specs section (bidirectional)
  if (relatedSpecs.length > 0) {
    console.log(chalk.bold('Related Specs:'));
    for (const rel of relatedSpecs) {
      const status = getStatusIndicator(rel.frontmatter.status);
      console.log(`  ⟷ ${sanitizeUserInput(rel.path)} ${status}`);
    }
    console.log('');
  }

  // Dependency chain (tree view)
  if (options.graph || dependsOn.length > 0) {
    console.log(chalk.bold('Dependency Chain:'));
    const chain = buildDependencyChain(spec, specMap, options.depth || 3);
    displayChain(chain, 0);
    console.log('');
  }
}

interface DependencyNode {
  spec: SpecInfo;
  dependencies: DependencyNode[];
}

function findDependencies(spec: SpecInfo, specMap: Map<string, SpecInfo>): SpecInfo[] {
  if (!spec.frontmatter.depends_on) return [];
  
  const deps: SpecInfo[] = [];
  for (const depPath of spec.frontmatter.depends_on) {
    const dep = specMap.get(depPath);
    if (dep) {
      deps.push(dep);
    } else {
      // Try to find by name only (in case of relative path)
      for (const [path, s] of specMap.entries()) {
        if (path.includes(depPath)) {
          deps.push(s);
          break;
        }
      }
    }
  }
  
  return deps;
}

function findBlocking(spec: SpecInfo, allSpecs: SpecInfo[]): SpecInfo[] {
  const blocks: SpecInfo[] = [];
  
  for (const other of allSpecs) {
    if (other.path === spec.path) continue;
    
    if (other.frontmatter.depends_on) {
      for (const depPath of other.frontmatter.depends_on) {
        if (depPath === spec.path || spec.path.includes(depPath)) {
          blocks.push(other);
          break;
        }
      }
    }
  }
  
  return blocks;
}

function findRelated(spec: SpecInfo, specMap: Map<string, SpecInfo>): SpecInfo[] {
  if (!spec.frontmatter.related) return [];
  
  const related: SpecInfo[] = [];
  for (const relPath of spec.frontmatter.related) {
    const rel = specMap.get(relPath);
    if (rel) {
      related.push(rel);
    } else {
      // Try to find by name only
      for (const [path, s] of specMap.entries()) {
        if (path.includes(relPath)) {
          related.push(s);
          break;
        }
      }
    }
  }
  
  return related;
}

function findRelatedBy(spec: SpecInfo, allSpecs: SpecInfo[]): SpecInfo[] {
  const relatedBy: SpecInfo[] = [];
  
  for (const other of allSpecs) {
    if (other.path === spec.path) continue;
    
    if (other.frontmatter.related) {
      for (const relPath of other.frontmatter.related) {
        if (relPath === spec.path || spec.path.includes(relPath)) {
          relatedBy.push(other);
          break;
        }
      }
    }
  }
  
  return relatedBy;
}

/**
 * Find all related specs bidirectionally - combines specs that this spec
 * relates to AND specs that relate to this spec, deduplicated.
 */
function findAllRelated(
  spec: SpecInfo, 
  specMap: Map<string, SpecInfo>, 
  allSpecs: SpecInfo[]
): SpecInfo[] {
  const outgoing = findRelated(spec, specMap);
  const incoming = findRelatedBy(spec, allSpecs);
  
  // Merge and deduplicate by path
  const seenPaths = new Set<string>();
  const merged: SpecInfo[] = [];
  
  for (const s of [...outgoing, ...incoming]) {
    if (!seenPaths.has(s.path)) {
      seenPaths.add(s.path);
      merged.push(s);
    }
  }
  
  return merged;
}

function buildDependencyChain(
  spec: SpecInfo,
  specMap: Map<string, SpecInfo>,
  maxDepth: number,
  currentDepth: number = 0,
  visited: Set<string> = new Set()
): DependencyNode {
  const node: DependencyNode = {
    spec,
    dependencies: [],
  };
  
  // Prevent infinite loops
  if (visited.has(spec.path)) {
    return node;
  }
  visited.add(spec.path);
  
  // Stop at max depth
  if (currentDepth >= maxDepth) {
    return node;
  }
  
  // Find dependencies
  const deps = findDependencies(spec, specMap);
  for (const dep of deps) {
    node.dependencies.push(buildDependencyChain(dep, specMap, maxDepth, currentDepth + 1, visited));
  }
  
  return node;
}

function displayChain(node: DependencyNode, level: number): void {
  const indent = '  '.repeat(level);
  const status = getStatusIndicator(node.spec.frontmatter.status);
  const name = level === 0 ? chalk.cyan(node.spec.path) : node.spec.path;
  
  console.log(`${indent}${name} ${status}`);
  
  for (const dep of node.dependencies) {
    const prefix = '  '.repeat(level) + '└─ ';
    const depStatus = getStatusIndicator(dep.spec.frontmatter.status);
    console.log(`${prefix}${dep.spec.path} ${depStatus}`);
    
    // Recursively display nested dependencies with increased indent
    for (const nestedDep of dep.dependencies) {
      displayChain(nestedDep, level + 2);
    }
  }
}
