import chalk from 'chalk';
import { Command } from 'commander';
import { getSpec, loadAllSpecs, type SpecInfo } from '../spec-loader.js';
import { autoCheckIfEnabled } from './check.js';
import { sanitizeUserInput } from '../utils/ui.js';
import { resolveSpecPath } from '../utils/path-helpers.js';
import { loadConfig } from '../config.js';
import * as path from 'node:path';
import { getStatusIndicator } from '../utils/colors.js';
import { SpecDependencyGraph } from '@leanspec/core';

export interface DepsOptions {
  depth?: number;
  graph?: boolean;
  json?: boolean;
  mode?: 'complete' | 'upstream' | 'downstream' | 'impact';
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
    .option('--complete', 'Show complete graph (default: all relationships)')
    .option('--upstream', 'Show only upstream dependencies')
    .option('--downstream', 'Show only downstream dependents')
    .option('--impact', 'Show impact radius (all affected specs)')
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

  // Load all specs and build dependency graph
  const allSpecs = await loadAllSpecs({ includeArchived: true });
  const graph = new SpecDependencyGraph(allSpecs);
  
  // Determine mode from options (explicit flags take precedence)
  let mode: 'complete' | 'upstream' | 'downstream' | 'impact' = 'complete';
  if (options.mode) {
    mode = options.mode;
  } else if ((options as any).upstream) {
    mode = 'upstream';
  } else if ((options as any).downstream) {
    mode = 'downstream';
  } else if ((options as any).impact) {
    mode = 'impact';
  }
  
  const specMap = new Map<string, SpecInfo>();
  for (const s of allSpecs) {
    specMap.set(s.path, s);
  }

  // Get dependency information based on mode
  let dependsOn: SpecInfo[] = [];
  let requiredBy: SpecInfo[] = [];
  let related: SpecInfo[] = [];
  
  if (mode === 'complete') {
    const completeGraph = graph.getCompleteGraph(spec.path);
    dependsOn = completeGraph.dependsOn;
    requiredBy = completeGraph.requiredBy;
    related = completeGraph.related;
  } else if (mode === 'upstream') {
    dependsOn = graph.getUpstream(spec.path, options.depth || 3);
  } else if (mode === 'downstream') {
    requiredBy = graph.getDownstream(spec.path, options.depth || 3);
  } else if (mode === 'impact') {
    const impact = graph.getImpactRadius(spec.path, options.depth || 3);
    dependsOn = impact.upstream;
    requiredBy = impact.downstream;
    related = impact.related;
  }

  // Output as JSON if requested
  if (options.json) {
    const data: any = {
      spec: spec.path,
      mode,
    };
    
    if (mode === 'complete' || mode === 'upstream' || mode === 'impact') {
      data.dependsOn = dependsOn.map(s => ({ path: s.path, status: s.frontmatter.status }));
    }
    
    if (mode === 'complete' || mode === 'downstream' || mode === 'impact') {
      data.requiredBy = requiredBy.map(s => ({ path: s.path, status: s.frontmatter.status }));
    }
    
    if (mode === 'complete' || mode === 'impact') {
      data.related = related.map(s => ({ path: s.path, status: s.frontmatter.status }));
    }
    
    if (mode === 'complete' && (options.graph || dependsOn.length > 0)) {
      data.chain = buildDependencyChain(spec, specMap, options.depth || 3);
    }
    
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // Display dependencies
  console.log('');
  console.log(chalk.green(`📦 Dependencies for ${chalk.cyan(sanitizeUserInput(spec.path))}`));
  console.log('');

  // Check if there are any relationships at all
  const hasAnyRelationships = dependsOn.length > 0 || requiredBy.length > 0 || related.length > 0;
  
  if (!hasAnyRelationships) {
    console.log(chalk.gray('  No dependencies or relationships'));
    console.log('');
    return;
  }

  // Depends On section (Upstream)
  if ((mode === 'complete' || mode === 'upstream' || mode === 'impact') && dependsOn.length > 0) {
    const label = mode === 'complete' ? 'Depends On' : mode === 'upstream' ? 'Upstream Dependencies' : 'Upstream (Impact)';
    console.log(chalk.bold(`${label}:`));
    for (const dep of dependsOn) {
      const status = getStatusIndicator(dep.frontmatter.status);
      console.log(`  → ${sanitizeUserInput(dep.path)} ${status}`);
    }
    console.log('');
  }

  // Required By section (Downstream)
  if ((mode === 'complete' || mode === 'downstream' || mode === 'impact') && requiredBy.length > 0) {
    const label = mode === 'complete' ? 'Required By' : mode === 'downstream' ? 'Downstream Dependents' : 'Downstream (Impact)';
    console.log(chalk.bold(`${label}:`));
    for (const blocked of requiredBy) {
      const status = getStatusIndicator(blocked.frontmatter.status);
      console.log(`  ← ${sanitizeUserInput(blocked.path)} ${status}`);
    }
    console.log('');
  }

  // Related Specs section (bidirectional)
  if ((mode === 'complete' || mode === 'impact') && related.length > 0) {
    console.log(chalk.bold('Related Specs:'));
    for (const rel of related) {
      const status = getStatusIndicator(rel.frontmatter.status);
      console.log(`  ⟷ ${sanitizeUserInput(rel.path)} ${status}`);
    }
    console.log('');
  }

  // Dependency chain (tree view) - only for complete mode or when graph is requested
  if (mode === 'complete' && (options.graph || dependsOn.length > 0)) {
    console.log(chalk.bold('Dependency Chain:'));
    const chain = buildDependencyChain(spec, specMap, options.depth || 3);
    displayChain(chain, 0);
    console.log('');
  }
  
  // Impact summary for impact mode
  if (mode === 'impact') {
    const total = dependsOn.length + requiredBy.length + related.length;
    console.log(chalk.bold(`Impact Summary:`));
    console.log(`  Changing this spec affects ${chalk.yellow(total)} specs total`);
    console.log(`    Upstream: ${dependsOn.length} | Downstream: ${requiredBy.length} | Related: ${related.length}`);
    console.log('');
  }
}

interface DependencyNode {
  spec: SpecInfo;
  dependencies: DependencyNode[];
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
  
  // Find dependencies from frontmatter
  if (spec.frontmatter.depends_on) {
    for (const depPath of spec.frontmatter.depends_on) {
      const dep = specMap.get(depPath);
      if (dep) {
        node.dependencies.push(buildDependencyChain(dep, specMap, maxDepth, currentDepth + 1, visited));
      }
    }
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
