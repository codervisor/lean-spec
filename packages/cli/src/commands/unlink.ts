import * as path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { loadConfig } from '../config.js';
import { getSpecFile, updateFrontmatter } from '../frontmatter.js';
import { resolveSpecPath } from '../utils/path-helpers.js';
import { autoCheckIfEnabled } from './check.js';
import { sanitizeUserInput } from '../utils/ui.js';

/**
 * Unlink command - remove dependencies between specs
 */
export function unlinkCommand(): Command {
  return new Command('unlink')
    .description('Remove dependencies between specs')
    .argument('<spec>', 'Spec to update')
    .option('--depends-on [specs]', 'Remove dependencies (comma-separated spec numbers or names, or use with --all)')
    .option('--all', 'Remove all dependencies')
    .action(async (specPath: string, options: {
      dependsOn?: string | boolean;
      all?: boolean;
    }) => {
      if (!options.dependsOn) {
        console.error('Error: --depends-on is required');
        process.exit(1);
      }

      await unlinkSpec(specPath, options);
    });
}

export async function unlinkSpec(
  specPath: string,
  options: {
    dependsOn?: string | boolean;
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

  // Read current frontmatter
  const { parseFrontmatter } = await import('../frontmatter.js');
  const currentFrontmatter = await parseFrontmatter(specFile);
  const currentDependsOn = currentFrontmatter?.depends_on || [];

  let newDependsOn: string[];
  let removedCount = 0;

  if (options.all || options.dependsOn === true) {
    // Remove all dependencies (when --all or --depends-on used without value)
    newDependsOn = [];
    removedCount = currentDependsOn.length;
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

    newDependsOn = currentDependsOn.filter(dep => !resolvedToRemove.has(dep));
    removedCount = currentDependsOn.length - newDependsOn.length;
  }

  if (removedCount === 0) {
    console.log(chalk.gray(`ℹ No matching dependencies found to remove`));
    return;
  }

  // Update frontmatter
  await updateFrontmatter(specFile, { depends_on: newDependsOn });

  // Success message
  console.log(chalk.green(`✓ Removed ${removedCount} dependencies`));
  console.log(chalk.gray(`  Updated: ${sanitizeUserInput(path.relative(cwd, resolvedPath))}`));
}
