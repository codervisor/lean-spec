import * as path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { loadConfig } from '../config.js';
import { getSpecFile, updateFrontmatter } from '../frontmatter.js';
import { resolveSpecPath } from '../utils/path-helpers.js';
import type { SpecStatus, SpecPriority } from '../frontmatter.js';
import { autoCheckIfEnabled } from './check.js';
import { sanitizeUserInput } from '../utils/ui.js';
import { parseCustomFieldOptions } from '../utils/cli-helpers.js';

/**
 * Update command - update spec metadata
 */
export function updateCommand(): Command {
  return new Command('update')
    .description('Update spec metadata')
    .argument('<spec>', 'Spec to update')
    .option('--status <status>', 'Set status (planned, in-progress, complete, archived)')
    .option('--priority <priority>', 'Set priority (low, medium, high, critical)')
    .option('--tags <tags>', 'Set tags (comma-separated)')
    .option('--assignee <name>', 'Set assignee')
    .option('--field <name=value...>', 'Set custom field (can specify multiple)')
    .action(async (specPath: string, options: {
      status?: SpecStatus;
      priority?: SpecPriority;
      tags?: string;
      assignee?: string;
      field?: string[];
    }) => {
      const customFields = parseCustomFieldOptions(options.field);
      const updates: {
        status?: SpecStatus;
        priority?: SpecPriority;
        tags?: string[];
        assignee?: string;
        customFields?: Record<string, unknown>;
      } = {
        status: options.status,
        priority: options.priority,
        tags: options.tags ? options.tags.split(',').map(t => t.trim()) : undefined,
        assignee: options.assignee,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      };
      
      Object.keys(updates).forEach(key => {
        if (updates[key as keyof typeof updates] === undefined) {
          delete updates[key as keyof typeof updates];
        }
      });
      
      if (Object.keys(updates).length === 0) {
        console.error('Error: At least one update option required (--status, --priority, --tags, --assignee, --field)');
        process.exit(1);
      }
      
      await updateSpec(specPath, updates);
    });
}

export async function updateSpec(
  specPath: string,
  updates: {
    status?: SpecStatus;
    priority?: SpecPriority;
    tags?: string[];
    assignee?: string;
    customFields?: Record<string, unknown>;
  },
  options: { cwd?: string } = {}
): Promise<void> {
  // Auto-check for conflicts before update
  await autoCheckIfEnabled();
  
  const cwd = options.cwd ?? process.cwd();
  const config = await loadConfig(cwd);
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
