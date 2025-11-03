import chalk from 'chalk';
import { getSpec, loadAllSpecs, type SpecInfo } from '../spec-loader.js';
import { autoCheckIfEnabled } from './check.js';
import { sanitizeUserInput } from '../utils/ui.js';

export async function depsCommand(specPath: string, options: {
  depth?: number;
  graph?: boolean;
  json?: boolean;
}): Promise<void> {
  // Auto-check for conflicts before display
  await autoCheckIfEnabled();
  
  const spec = await getSpec(specPath);
  
  if (!spec) {
    console.error(chalk.red(`Error: Spec not found: ${sanitizeUserInput(specPath)}`));
    process.exit(1);
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
  const related = findRelated(spec, specMap);

  // Output as JSON if requested
  if (options.json) {
    const data = {
      spec: spec.path,
      dependsOn: dependsOn.map(s => ({ path: s.path, status: s.frontmatter.status })),
      blocks: blocks.map(s => ({ path: s.path, status: s.frontmatter.status })),
      related: related.map(s => ({ path: s.path, status: s.frontmatter.status })),
      chain: buildDependencyChain(spec, specMap, options.depth || 3),
    };
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // Display dependencies
  console.log('');
  console.log(chalk.green(`📦 Dependencies for ${chalk.cyan(sanitizeUserInput(spec.path))}`));
  console.log('');

  // Depends On section
  console.log(chalk.bold('Depends On:'));
  if (dependsOn.length > 0) {
    for (const dep of dependsOn) {
      const status = getStatusIndicator(dep.frontmatter.status);
      console.log(`  → ${sanitizeUserInput(dep.path)} ${status}`);
    }
  } else {
    console.log(chalk.gray('  (none)'));
  }
  console.log('');

  // Blocks section
  console.log(chalk.bold('Blocks:'));
  if (blocks.length > 0) {
    for (const blocked of blocks) {
      const status = getStatusIndicator(blocked.frontmatter.status);
      console.log(`  ← ${sanitizeUserInput(blocked.path)} ${status}`);
    }
  } else {
    console.log(chalk.gray('  (none)'));
  }
  console.log('');

  // Related section
  if (related.length > 0) {
    console.log(chalk.bold('Related:'));
    for (const rel of related) {
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

function getStatusIndicator(status: string): string {
  switch (status) {
    case 'planned': return chalk.gray('[planned]');
    case 'in-progress': return chalk.yellow('[in-progress]');
    case 'complete': return chalk.green('✓');
    case 'archived': return chalk.gray('[archived]');
    default: return '';
  }
}
