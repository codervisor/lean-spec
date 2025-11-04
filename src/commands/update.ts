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
    throw new Error(`Spec not found: ${sanitizeUserInput(specPath)}. Tried: ${sanitizeUserInput(specPath)}, specs/${sanitizeUserInput(specPath)}, and searching in date directories`);
  }

  // Get spec file
  const specFile = await getSpecFile(resolvedPath, config.structure.defaultFile);
  if (!specFile) {
    throw new Error(`No spec file found in: ${sanitizeUserInput(specPath)}`);
  }

  // Merge custom fields into updates object, filtering out undefined values
  const allUpdates: Record<string, unknown> = {};
  
  // Only add defined values
  if (updates.status !== undefined) allUpdates.status = updates.status;
  if (updates.priority !== undefined) allUpdates.priority = updates.priority;
  if (updates.tags !== undefined) allUpdates.tags = updates.tags;
  if (updates.assignee !== undefined) allUpdates.assignee = updates.assignee;
  
  if (updates.customFields) {
    Object.entries(updates.customFields).forEach(([key, value]) => {
      if (value !== undefined) {
        allUpdates[key] = value;
      }
    });
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
