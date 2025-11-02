import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';
import { loadConfig } from '../config.js';
import { withSpinner } from '../utils/ui.js';
import { loadAllSpecs } from '../spec-loader.js';
import { getStatusEmoji, getPriorityLabel } from '../utils/spec-helpers.js';
import type { SpecFilterOptions, SpecStatus, SpecPriority } from '../frontmatter.js';

export async function listSpecs(options: {
  showArchived?: boolean;
  status?: SpecStatus | SpecStatus[];
  tags?: string[];
  priority?: SpecPriority | SpecPriority[];
  assignee?: string;
  customFields?: Record<string, unknown>;
} = {}): Promise<void> {
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);
  
  try {
    await fs.access(specsDir);
  } catch {
    console.log('');
    console.log('No specs directory found. Initialize with: lspec init');
    console.log('');
    return;
  }

  // Build filter options
  const filter: SpecFilterOptions = {};
  if (options.status) filter.status = options.status;
  if (options.tags) filter.tags = options.tags;
  if (options.priority) filter.priority = options.priority;
  if (options.assignee) filter.assignee = options.assignee;
  if (options.customFields) filter.customFields = options.customFields;

  const specs = await withSpinner(
    'Loading specs...',
    () => loadAllSpecs({
      includeArchived: options.showArchived || false,
      filter,
    })
  );

  console.log('');
  console.log(chalk.green('=== Specs ==='));
  console.log('');

  if (specs.length === 0) {
    if (Object.keys(filter).length > 0) {
      console.log('No specs match the specified filters.');
    } else {
      console.log('No specs found. Create one with: lspec create <name>');
    }
    console.log('');
    return;
  }

  // Group specs by date directory
  const byDate = new Map<string, typeof specs>();
  for (const spec of specs) {
    const dateMatch = spec.path.match(/^(\d{8})\//);
    const dateKey = dateMatch ? dateMatch[1] : 'unknown';
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, []);
    }
    byDate.get(dateKey)!.push(spec);
  }

  // Display grouped by date (newest first)
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));
  
  for (const date of sortedDates) {
    const dateSpecs = byDate.get(date)!;
    console.log(chalk.cyan(`${date}/`));
    
    for (const spec of dateSpecs) {
      const specName = spec.path.replace(/^\d{8}\//, '').replace(/\/$/, '');
      let line = `  ${specName}/`;
      
      // Add metadata
      const meta: string[] = [];
      meta.push(getStatusEmoji(spec.frontmatter.status));
      if (spec.frontmatter.priority) {
        meta.push(getPriorityLabel(spec.frontmatter.priority));
      }
      if (spec.frontmatter.tags && spec.frontmatter.tags.length > 0) {
        meta.push(chalk.gray(`[${spec.frontmatter.tags.join(', ')}]`));
      }
      
      if (meta.length > 0) {
        line += ` ${meta.join(' ')}`;
      }
      
      console.log(line);
    }
    console.log('');
  }

  console.log('');
}
