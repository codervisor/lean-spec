import * as path from 'node:path';
import chalk from 'chalk';
import { loadConfig } from '../config.js';
import { getSpecFile, updateFrontmatter } from '../frontmatter.js';
import { resolveSpecPath } from '../utils/path-helpers.js';
import type { SpecStatus, SpecPriority } from '../frontmatter.js';
import { autoCheckIfEnabled } from './check.js';
import { sanitizeUserInput } from '../utils/ui.js';

export async function updateSpec(
  specPath: string,
  updates: {
    status?: SpecStatus;
    priority?: SpecPriority;
    tags?: string[];
    assignee?: string;
    customFields?: Record<string, unknown>;
  }
): Promise<void> {
  // Auto-check for conflicts before update
  await autoCheckIfEnabled();
  
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);
  
  const resolvedPath = await resolveSpecPath(specPath, cwd, specsDir);

  if (!resolvedPath) {
    console.error(chalk.red(`Error: Spec not found: ${sanitizeUserInput(specPath)}`));
    console.error(chalk.gray(`Tried: ${sanitizeUserInput(specPath)}, specs/${sanitizeUserInput(specPath)}, and searching in date directories`));
    process.exit(1);
  }

  // Get spec file
  const specFile = await getSpecFile(resolvedPath, config.structure.defaultFile);
  if (!specFile) {
    console.error(chalk.red(`Error: No spec file found in: ${sanitizeUserInput(specPath)}`));
    process.exit(1);
  }

  // Merge custom fields into updates object
  const allUpdates = { ...updates };
  if (updates.customFields) {
    Object.assign(allUpdates, updates.customFields);
    delete allUpdates.customFields;
  }

  // Update frontmatter
  await updateFrontmatter(specFile, allUpdates);

  console.log(chalk.green(`✓ Updated: ${sanitizeUserInput(path.relative(cwd, resolvedPath))}`));
  
  // Show what was updated
  const updatedFields = Object.keys(updates).filter(k => k !== 'customFields');
  if (updates.customFields) {
    updatedFields.push(...Object.keys(updates.customFields));
  }
  console.log(chalk.gray(`  Fields: ${updatedFields.join(', ')}`));
}
