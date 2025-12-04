import * as path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { loadConfig } from '../config.js';
import { getSpecFile, updateFrontmatter } from '../frontmatter.js';
import { resolveSpecPath } from '../utils/path-helpers.js';
import { autoCheckIfEnabled } from './check.js';
import { sanitizeUserInput } from '../utils/ui.js';
import { loadAllSpecs } from '../spec-loader.js';

/**
 * Link command - add dependencies between specs
 */
export function linkCommand(): Command {
  return new Command('link')
    .description('Add dependencies between specs')
    .argument('<spec>', 'Spec to update')
    .option('--depends-on <specs>', 'Add dependencies (comma-separated spec numbers or names)')
    .action(async (specPath: string, options: {
      dependsOn?: string;
    }) => {
      if (!options.dependsOn) {
        console.error('Error: --depends-on is required');
        process.exit(1);
      }

      await linkSpec(specPath, options);
    });
}

export async function linkSpec(
  specPath: string,
  options: {
    dependsOn?: string;
  }
): Promise<void> {
  // Auto-check for conflicts before update
  await autoCheckIfEnabled();

  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);

  // Resolve the target spec path
  const resolvedPath = await resolveSpecPath(specPath, cwd, specsDir);
  if (!resolvedPath) {
    throw new Error(`Spec not found: ${sanitizeUserInput(specPath)}`);
  }

  // Get spec file
  const specFile = await getSpecFile(resolvedPath, config.structure.defaultFile);
  if (!specFile) {
    throw new Error(`No spec file found in: ${sanitizeUserInput(specPath)}`);
  }

  // Load all specs for validation
  const allSpecs = await loadAllSpecs({ includeArchived: true });
  const specMap = new Map(allSpecs.map(s => [s.path, s]));

  // Parse dependency specs
  const dependsOnSpecs = options.dependsOn ? options.dependsOn.split(',').map(s => s.trim()) : [];

  // Get the target spec's short name for self-reference check
  const targetSpecName = path.basename(resolvedPath);

  // Validate all dependency specs exist and aren't self-references
  const resolvedDependencies = new Map<string, string>();

  for (const depSpec of dependsOnSpecs) {
    // Check for self-reference
    if (depSpec === targetSpecName || depSpec === specPath) {
      throw new Error(`Cannot link spec to itself: ${sanitizeUserInput(depSpec)}`);
    }

    const depResolvedPath = await resolveSpecPath(depSpec, cwd, specsDir);
    if (!depResolvedPath) {
      throw new Error(`Spec not found: ${sanitizeUserInput(depSpec)}`);
    }

    // Check for self-reference after resolution
    if (depResolvedPath === resolvedPath) {
      throw new Error(`Cannot link spec to itself: ${sanitizeUserInput(depSpec)}`);
    }

    const depSpecName = path.basename(depResolvedPath);
    resolvedDependencies.set(depSpec, depSpecName);
  }

  // Read current frontmatter to get existing dependencies
  const { parseFrontmatter } = await import('../frontmatter.js');
  const currentFrontmatter = await parseFrontmatter(specFile);
  const currentDependsOn = currentFrontmatter?.depends_on || [];

  // Build updated dependencies (add new ones, keep existing)
  const newDependsOn = [...currentDependsOn];
  let added = 0;
  for (const spec of dependsOnSpecs) {
    const resolvedName = resolvedDependencies.get(spec);
    if (resolvedName && !newDependsOn.includes(resolvedName)) {
      newDependsOn.push(resolvedName);
      added++;
    }
  }

  if (added === 0) {
    console.log(chalk.gray(`ℹ Dependencies already exist, no changes made`));
    return;
  }

  // Check for dependency cycles (warn, don't block)
  const cycles = detectCycles(targetSpecName, newDependsOn, specMap);
  if (cycles.length > 0) {
    console.log(chalk.yellow(`⚠️  Dependency cycle detected: ${cycles.join(' → ')}`));
  }

  // Update frontmatter
  await updateFrontmatter(specFile, { depends_on: newDependsOn });

  // Success message
  console.log(chalk.green(`✓ Added dependencies: ${dependsOnSpecs.join(', ')}`));
  console.log(chalk.gray(`  Updated: ${sanitizeUserInput(path.relative(cwd, resolvedPath))}`));
}

/**
 * Detect dependency cycles
 */
function detectCycles(
  startSpec: string,
  dependsOn: string[],
  specMap: Map<string, any>,
  visited: Set<string> = new Set(),
  path: string[] = []
): string[] {
  if (visited.has(startSpec)) {
    // Found a cycle
    const cycleStart = path.indexOf(startSpec);
    if (cycleStart !== -1) {
      return [...path.slice(cycleStart), startSpec];
    }
    return [];
  }

  visited.add(startSpec);
  path.push(startSpec);

  // Check each dependency
  for (const dep of dependsOn) {
    const depSpec = specMap.get(dep);
    if (depSpec && depSpec.frontmatter.depends_on) {
      const cycle = detectCycles(dep, depSpec.frontmatter.depends_on, specMap, new Set(visited), [...path]);
      if (cycle.length > 0) {
        return cycle;
      }
    }
  }

  return [];
}
