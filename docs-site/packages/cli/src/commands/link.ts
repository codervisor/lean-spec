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
 * Link command - add relationships between specs
 */
export function linkCommand(): Command {
  return new Command('link')
    .description('Add relationships between specs (depends_on, related)')
    .argument('<spec>', 'Spec to update')
    .option('--depends-on <specs>', 'Add dependencies (comma-separated spec numbers or names)')
    .option('--related <specs>', 'Add related specs (comma-separated spec numbers or names)')
    .action(async (specPath: string, options: {
      dependsOn?: string;
      related?: string;
    }) => {
      if (!options.dependsOn && !options.related) {
        console.error('Error: At least one relationship type required (--depends-on or --related)');
        process.exit(1);
      }

      await linkSpec(specPath, options);
    });
}

export async function linkSpec(
  specPath: string,
  options: {
    dependsOn?: string;
    related?: string;
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

  // Parse relationship specs
  const dependsOnSpecs = options.dependsOn ? options.dependsOn.split(',').map(s => s.trim()) : [];
  const relatedSpecs = options.related ? options.related.split(',').map(s => s.trim()) : [];

  // Get the target spec's short name for self-reference check
  const targetSpecName = path.basename(resolvedPath);

  // Validate all relationship specs exist and aren't self-references
  const allRelationshipSpecs = [...dependsOnSpecs, ...relatedSpecs];
  const resolvedRelationships = new Map<string, string>();

  for (const relSpec of allRelationshipSpecs) {
    // Check for self-reference
    if (relSpec === targetSpecName || relSpec === specPath) {
      throw new Error(`Cannot link spec to itself: ${sanitizeUserInput(relSpec)}`);
    }

    const relResolvedPath = await resolveSpecPath(relSpec, cwd, specsDir);
    if (!relResolvedPath) {
      throw new Error(`Spec not found: ${sanitizeUserInput(relSpec)}`);
    }

    // Check for self-reference after resolution
    if (relResolvedPath === resolvedPath) {
      throw new Error(`Cannot link spec to itself: ${sanitizeUserInput(relSpec)}`);
    }

    const relSpecName = path.basename(relResolvedPath);
    resolvedRelationships.set(relSpec, relSpecName);
  }

  // Read current frontmatter to get existing relationships
  const { parseFrontmatter } = await import('../frontmatter.js');
  const currentFrontmatter = await parseFrontmatter(specFile);
  const currentDependsOn = currentFrontmatter?.depends_on || [];
  const currentRelated = currentFrontmatter?.related || [];

  // Build updated relationships (add new ones, keep existing)
  const updates: { depends_on?: string[]; related?: string[] } = {};

  if (dependsOnSpecs.length > 0) {
    const newDependsOn = [...currentDependsOn];
    let added = 0;
    for (const spec of dependsOnSpecs) {
      const resolvedName = resolvedRelationships.get(spec);
      if (resolvedName && !newDependsOn.includes(resolvedName)) {
        newDependsOn.push(resolvedName);
        added++;
      }
    }
    updates.depends_on = newDependsOn;
    if (added === 0) {
      console.log(chalk.gray(`ℹ Dependencies already exist, no changes made`));
    }
  }

  if (relatedSpecs.length > 0) {
    const newRelated = [...currentRelated];
    let added = 0;
    const bidirectionalUpdates: string[] = [];

    for (const spec of relatedSpecs) {
      const resolvedName = resolvedRelationships.get(spec);
      if (resolvedName && !newRelated.includes(resolvedName)) {
        newRelated.push(resolvedName);
        added++;
        bidirectionalUpdates.push(resolvedName);
      }
    }
    updates.related = newRelated;

    // Update related specs bidirectionally
    for (const relSpecName of bidirectionalUpdates) {
      const relSpecPath = await resolveSpecPath(relSpecName, cwd, specsDir);
      if (relSpecPath) {
        const relSpecFile = await getSpecFile(relSpecPath, config.structure.defaultFile);
        if (relSpecFile) {
          const relFrontmatter = await parseFrontmatter(relSpecFile);
          const relCurrentRelated = relFrontmatter?.related || [];
          if (!relCurrentRelated.includes(targetSpecName)) {
            await updateFrontmatter(relSpecFile, {
              related: [...relCurrentRelated, targetSpecName],
            });
            console.log(chalk.gray(`  Updated: ${sanitizeUserInput(relSpecName)} (bidirectional)`));
          }
        }
      }
    }

    if (added === 0) {
      console.log(chalk.gray(`ℹ Related specs already exist, no changes made`));
    }
  }

  // Check for dependency cycles (warn, don't block)
  if (updates.depends_on && updates.depends_on.length > 0) {
    const cycles = detectCycles(targetSpecName, updates.depends_on, specMap);
    if (cycles.length > 0) {
      console.log(chalk.yellow(`⚠️  Dependency cycle detected: ${cycles.join(' → ')}`));
    }
  }

  // Update frontmatter
  await updateFrontmatter(specFile, updates);

  // Success message
  const updatedFields: string[] = [];
  if (dependsOnSpecs.length > 0) {
    updatedFields.push(`depends_on: ${dependsOnSpecs.join(', ')}`);
  }
  if (relatedSpecs.length > 0) {
    updatedFields.push(`related: ${relatedSpecs.join(', ')}`);
  }

  console.log(chalk.green(`✓ Added relationships: ${updatedFields.join(', ')}`));
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
