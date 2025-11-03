import chalk from 'chalk';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { loadConfig } from '../config.js';
import { withSpinner, sanitizeUserInput } from '../utils/ui.js';
import { loadAllSpecs } from '../spec-loader.js';
import type { SpecInfo } from '../spec-loader.js';
import type { SpecFilterOptions, SpecStatus, SpecPriority } from '../frontmatter.js';
import { autoCheckIfEnabled } from './check.js';

const PRIORITY_BADGES: Record<SpecPriority, { emoji: string; colorFn: (s: string) => string }> = {
  critical: { emoji: '🔴', colorFn: chalk.red },
  high: { emoji: '🟠', colorFn: chalk.hex('#FFA500') },
  medium: { emoji: '🟡', colorFn: chalk.yellow },
  low: { emoji: '🟢', colorFn: chalk.green },
};

const STATUS_EMOJI: Record<SpecStatus, string> = {
  planned: '📅',
  'in-progress': '⚡',
  complete: '✅',
  archived: '📦',
};

export async function listSpecs(options: {
  showArchived?: boolean;
  status?: SpecStatus | SpecStatus[];
  tags?: string[];
  priority?: SpecPriority | SpecPriority[];
  assignee?: string;
  customFields?: Record<string, unknown>;
} = {}): Promise<void> {
  // Auto-check for conflicts before listing
  await autoCheckIfEnabled();
  
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

  if (specs.length === 0) {
    console.log(chalk.dim('No specs found.'));
    return;
  }

  // Display header
  console.log(chalk.bold.cyan('📄 Spec List'));
  
  // Filter info
  const filterParts: string[] = [];
  if (options.status) {
    const statusStr = Array.isArray(options.status) ? options.status.join(',') : options.status;
    filterParts.push(`status=${statusStr}`);
  }
  if (options.tags) filterParts.push(`tags=${options.tags.join(',')}`);
  if (options.priority) {
    const priorityStr = Array.isArray(options.priority) ? options.priority.join(',') : options.priority;
    filterParts.push(`priority=${priorityStr}`);
  }
  if (options.assignee) filterParts.push(`assignee=${options.assignee}`);
  
  if (filterParts.length > 0) {
    console.log(chalk.dim(`Filtered by: ${filterParts.join(', ')}`));
  }
  console.log('');

  // Detect if we should use custom grouping
  const useCustomGrouping = 
    config.structure.pattern === 'custom' && 
    config.structure.groupExtractor;

  if (useCustomGrouping) {
    renderGroupedList(specs, config.structure.groupExtractor!);
  } else {
    renderFlatList(specs);
  }

  console.log('');
  console.log(chalk.bold(`Total: ${chalk.green(specs.length)} spec${specs.length !== 1 ? 's' : ''}`));
}

function renderFlatList(specs: SpecInfo[]): void {
  // Simple flat list - no grouping
  for (const spec of specs) {
    const statusEmoji = STATUS_EMOJI[spec.frontmatter.status] || '📄';
    const priorityEmoji = spec.frontmatter.priority ? PRIORITY_BADGES[spec.frontmatter.priority].emoji : '';
    
    let assigneeStr = '';
    if (spec.frontmatter.assignee) {
      assigneeStr = ' ' + chalk.cyan(`@${sanitizeUserInput(spec.frontmatter.assignee)}`);
    }
    
    let tagsStr = '';
    if (spec.frontmatter.tags?.length) {
      const tags = Array.isArray(spec.frontmatter.tags) ? spec.frontmatter.tags : [];
      if (tags.length > 0) {
        const tagStr = tags.map(tag => `#${sanitizeUserInput(tag)}`).join(' ');
        tagsStr = ' ' + chalk.dim(chalk.magenta(tagStr));
      }
    }

    const priorityPrefix = priorityEmoji ? `${priorityEmoji} ` : '';
    console.log(`${priorityPrefix}${statusEmoji} ${chalk.cyan(sanitizeUserInput(spec.path))}${assigneeStr}${tagsStr}`);
  }
}

function renderGroupedList(specs: SpecInfo[], groupExtractor: string): void {
  // Extract group pattern (e.g., "{YYYYMMDD}" or "milestone-{milestone}")
  const isDatePattern = groupExtractor.match(/\{YYYY/);

  // Group specs by their folder/group
  const groups = new Map<string, SpecInfo[]>();
  
  for (const spec of specs) {
    // Extract group from path (first part before spec name)
    const pathParts = spec.path.split('/');
    let group = 'unknown';
    
    if (pathParts.length > 1) {
      // Has a parent folder (e.g., "20251103/001-spec" or "milestone-1/001-spec")
      group = pathParts[0];
    } else if (isDatePattern && spec.date) {
      // No folder but we have date metadata
      group = spec.date;
    }
    
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(spec);
  }

  // Sort groups (dates descending, others ascending)
  const sortedGroups = Array.from(groups.keys()).sort((a, b) => {
    // If looks like dates (8 digits), sort descending (newest first)
    if (/^\d{8}$/.test(a) && /^\d{8}$/.test(b)) {
      return b.localeCompare(a);
    }
    // Otherwise alphabetically ascending
    return a.localeCompare(b);
  });

  // Render each group
  for (let i = 0; i < sortedGroups.length; i++) {
    const groupName = sortedGroups[i];
    const groupSpecs = groups.get(groupName)!;

    // Group header
    const groupEmoji = /^\d{8}$/.test(groupName) ? '📅' : 
                       groupName.startsWith('milestone') ? '🎯' :
                       '📁';
    console.log(`${chalk.bold.cyan(`${groupEmoji} ${groupName}/`)} ${chalk.dim(`(${groupSpecs.length})`)}`);
    console.log('');

    // Render specs in this group - simple flat list
    for (const spec of groupSpecs) {
      const statusEmoji = STATUS_EMOJI[spec.frontmatter.status] || '📄';
      const priorityEmoji = spec.frontmatter.priority ? PRIORITY_BADGES[spec.frontmatter.priority].emoji : '';
      
      // Remove group prefix from display path
      const displayPath = spec.path.includes('/') 
        ? spec.path.split('/').slice(1).join('/')
        : spec.path;
      
      let assigneeStr = '';
      if (spec.frontmatter.assignee) {
        assigneeStr = ' ' + chalk.cyan(`@${sanitizeUserInput(spec.frontmatter.assignee)}`);
      }
      
      let tagsStr = '';
      if (spec.frontmatter.tags?.length) {
        const tags = Array.isArray(spec.frontmatter.tags) ? spec.frontmatter.tags : [];
        if (tags.length > 0) {
          const tagStr = tags.map(tag => `#${sanitizeUserInput(tag)}`).join(' ');
          tagsStr = ' ' + chalk.dim(chalk.magenta(tagStr));
        }
      }

      const priorityPrefix = priorityEmoji ? `${priorityEmoji} ` : '';
      console.log(`  ${priorityPrefix}${statusEmoji} ${chalk.cyan(sanitizeUserInput(displayPath))}${assigneeStr}${tagsStr}`);
    }

    // Spacing between groups
    if (i < sortedGroups.length - 1) {
      console.log('');
    }
  }
}
