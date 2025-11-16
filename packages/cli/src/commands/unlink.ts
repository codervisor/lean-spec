import * as path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { loadConfig } from '../config.js';
import { getSpecFile, updateFrontmatter } from '../frontmatter.js';
import { resolveSpecPath } from '../utils/path-helpers.js';
import { autoCheckIfEnabled } from './check.js';
import { sanitizeUserInput } from '../utils/ui.js';

/**
 * Unlink command - remove relationships between specs
 */
export function unlinkCommand(): Command {
  return new Command('unlink')
    .description('Remove relationships between specs (depends_on, related)')
    .argument('<spec>', 'Spec to update')
    .option('--depends-on [specs]', 'Remove dependencies (comma-separated spec numbers or names, or use with --all)')
    .option('--related [specs]', 'Remove related specs (comma-separated spec numbers or names, or use with --all)')
    .option('--all', 'Remove all relationships of the specified type(s)')
    .action(async (specPath: string, options: {
      dependsOn?: string | boolean;
      related?: string | boolean;
      all?: boolean;
    }) => {
      if (!options.dependsOn && !options.related) {
        console.error('Error: At least one relationship type required (--depends-on or --related)');
        process.exit(1);
      }

      await unlinkSpec(specPath, options);
    });
}

export async function unlinkSpec(
  specPath: string,
  options: {
    dependsOn?: string | boolean;
    related?: string | boolean;
    all?: boolean;
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

  // Get the target spec's short name
  const targetSpecName = path.basename(resolvedPath);

  // Read current frontmatter
  const { parseFrontmatter } = await import('../frontmatter.js');
  const currentFrontmatter = await parseFrontmatter(specFile);
  const currentDependsOn = currentFrontmatter?.depends_on || [];
  const currentRelated = currentFrontmatter?.related || [];

  // Build updated relationships
  const updates: { depends_on?: string[]; related?: string[] } = {};
  let removedCount = 0;

  if (options.dependsOn !== undefined) {
    if (options.all || options.dependsOn === true) {
      // Remove all dependencies (when --all or --depends-on used without value)
      updates.depends_on = [];
      removedCount += currentDependsOn.length;
    } else {
      // Remove specific dependencies
      const toRemove = (options.dependsOn as string).split(',').map(s => s.trim());
      const resolvedToRemove = new Set<string>();

      // Resolve each spec to remove
      for (const spec of toRemove) {
        const resolvedSpecPath = await resolveSpecPath(spec, cwd, specsDir);
        if (resolvedSpecPath) {
          resolvedToRemove.add(path.basename(resolvedSpecPath));
        } else {
          // Also try to match by spec name directly
          resolvedToRemove.add(spec);
        }
      }

      const newDependsOn = currentDependsOn.filter(dep => !resolvedToRemove.has(dep));
      removedCount += currentDependsOn.length - newDependsOn.length;
      updates.depends_on = newDependsOn;
    }
  }

  if (options.related !== undefined) {
    if (options.all || options.related === true) {
      // Remove all related specs and update them bidirectionally (when --all or --related used without value)
      for (const relSpec of currentRelated) {
        const relSpecPath = await resolveSpecPath(relSpec, cwd, specsDir);
        if (relSpecPath) {
          const relSpecFile = await getSpecFile(relSpecPath, config.structure.defaultFile);
          if (relSpecFile) {
            const relFrontmatter = await parseFrontmatter(relSpecFile);
            const relCurrentRelated = relFrontmatter?.related || [];
            const relNewRelated = relCurrentRelated.filter(r => r !== targetSpecName);
            if (relNewRelated.length !== relCurrentRelated.length) {
              await updateFrontmatter(relSpecFile, {
                related: relNewRelated,
              });
              console.log(chalk.gray(`  Updated: ${sanitizeUserInput(relSpec)} (bidirectional)`));
            }
          }
        }
      }
      removedCount += currentRelated.length;
      updates.related = [];
    } else {
      // Remove specific related specs
      const toRemove = (options.related as string).split(',').map(s => s.trim());
      const resolvedToRemove = new Set<string>();

      // Resolve each spec to remove and update bidirectionally
      for (const spec of toRemove) {
        const resolvedSpecPath = await resolveSpecPath(spec, cwd, specsDir);
        if (resolvedSpecPath) {
          const specName = path.basename(resolvedSpecPath);
          resolvedToRemove.add(specName);

          // Update the related spec to remove reverse relationship
          const relSpecFile = await getSpecFile(resolvedSpecPath, config.structure.defaultFile);
          if (relSpecFile) {
            const relFrontmatter = await parseFrontmatter(relSpecFile);
            const relCurrentRelated = relFrontmatter?.related || [];
            const relNewRelated = relCurrentRelated.filter(r => r !== targetSpecName);
            if (relNewRelated.length !== relCurrentRelated.length) {
              await updateFrontmatter(relSpecFile, {
                related: relNewRelated,
              });
              console.log(chalk.gray(`  Updated: ${sanitizeUserInput(specName)} (bidirectional)`));
            }
          }
        } else {
          // Try to match by spec name directly
          resolvedToRemove.add(spec);
        }
      }

      const newRelated = currentRelated.filter(rel => !resolvedToRemove.has(rel));
      removedCount += currentRelated.length - newRelated.length;
      updates.related = newRelated;
    }
  }

  // Update frontmatter
  await updateFrontmatter(specFile, updates);

  // Success message
  if (removedCount === 0) {
    console.log(chalk.gray(`ℹ No matching relationships found to remove`));
  } else {
    const updatedFields: string[] = [];
    if (options.dependsOn !== undefined) {
      updatedFields.push(`depends_on`);
    }
    if (options.related !== undefined) {
      updatedFields.push(`related`);
    }
    console.log(chalk.green(`✓ Removed relationships: ${updatedFields.join(', ')} (${removedCount} total)`));
    console.log(chalk.gray(`  Updated: ${sanitizeUserInput(path.relative(cwd, resolvedPath))}`));
  }
}
