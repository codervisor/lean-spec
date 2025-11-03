import chalk from 'chalk';
import { loadAllSpecs } from '../spec-loader.js';
import type { SpecInfo } from '../spec-loader.js';
import type { SpecFilterOptions, SpecStatus } from '../frontmatter.js';
import { withSpinner } from '../utils/ui.js';
import { autoCheckIfEnabled } from './check.js';

const STATUS_CONFIG: Record<SpecStatus, { emoji: string; label: string; colorFn: (s: string) => string }> = {
  planned: { emoji: '📋', label: 'Planned', colorFn: chalk.cyan },
  'in-progress': { emoji: '⚡', label: 'In Progress', colorFn: chalk.yellow },
  complete: { emoji: '✅', label: 'Complete', colorFn: chalk.green },
  archived: { emoji: '📦', label: 'Archived', colorFn: chalk.dim },
};

export async function boardCommand(options: {
  showComplete?: boolean;
  tag?: string;
  assignee?: string;
}): Promise<void> {
  // Auto-check for conflicts before display
  await autoCheckIfEnabled();
  
  // Build filter
  const filter: SpecFilterOptions = {};
  if (options.tag) {
    filter.tags = [options.tag];
  }
  if (options.assignee) {
    filter.assignee = options.assignee;
  }

  // Load all specs with spinner (exclude archived, they go in their own archive view)
  const specs = await withSpinner(
    'Loading specs...',
    () => loadAllSpecs({
      includeArchived: false,
      filter,
    })
  );

  if (specs.length === 0) {
    console.log('No specs found.');
    return;
  }

  // Group specs by status
  const columns: Record<SpecStatus, SpecInfo[]> = {
    planned: [],
    'in-progress': [],
    complete: [],
    archived: [],
  };

  for (const spec of specs) {
    // Handle invalid status by treating as 'planned'
    const status = columns[spec.frontmatter.status] !== undefined 
      ? spec.frontmatter.status 
      : 'planned';
    columns[status].push(spec);
  }

  // Display header
  console.log(chalk.bold.cyan('📋 Spec Kanban Board'));
  
  // Filter info
  if (options.tag || options.assignee) {
    const filterParts: string[] = [];
    if (options.tag) filterParts.push(`tag=${options.tag}`);
    if (options.assignee) filterParts.push(`assignee=${options.assignee}`);
    console.log(chalk.dim(`Filtered by: ${filterParts.join(', ')}`));
  }
  console.log('');

  // Render columns
  renderColumn(STATUS_CONFIG.planned.label, STATUS_CONFIG.planned.emoji, columns.planned, true, STATUS_CONFIG.planned.colorFn);
  renderColumn(STATUS_CONFIG['in-progress'].label, STATUS_CONFIG['in-progress'].emoji, columns['in-progress'], true, STATUS_CONFIG['in-progress'].colorFn);
  renderColumn(STATUS_CONFIG.complete.label, STATUS_CONFIG.complete.emoji, columns.complete, options.showComplete || false, STATUS_CONFIG.complete.colorFn);
}

function renderColumn(
  title: string,
  emoji: string,
  specs: SpecInfo[],
  expanded: boolean,
  colorFn: (s: string) => string
): void {
  const width = 68;
  const count = specs.length;
  const header = `${emoji} ${title} (${count})`;
  const padding = Math.max(0, width - header.length - 4);

  const topLeft = '╭';
  const topRight = '╮';
  const bottomLeft = '╰';
  const bottomRight = '╯';
  const horizontal = '─';
  const vertical = '│';

  // Top border with title
  console.log(`${topLeft}${horizontal} ${colorFn(chalk.bold(header))} ${horizontal.repeat(padding)}${topRight}`);

  // Content
  if (expanded && specs.length > 0) {
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      
      // Spec name
      console.log(`${vertical} ${chalk.bold.cyan(spec.path.padEnd(width))} ${vertical}`);

      // Metadata line with tags and priority
      if (spec.frontmatter.tags?.length || spec.frontmatter.priority || spec.frontmatter.assignee) {
        const parts: string[] = [];
        
        if (spec.frontmatter.tags?.length) {
          const tagStr = spec.frontmatter.tags.map(tag => `#${tag}`).join(' ');
          parts.push(tagStr);
        }
        
        if (spec.frontmatter.priority) {
          const priorityEmoji = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢',
          }[spec.frontmatter.priority];
          parts.push(`${priorityEmoji} ${spec.frontmatter.priority}`);
        }
        
        if (spec.frontmatter.assignee) {
          parts.push(`@${spec.frontmatter.assignee}`);
        }
        
        const metaText = parts.join(' · ');
        const paddingNeeded = Math.max(0, width - metaText.length);
        
        console.log(`${vertical} ${chalk.dim(metaText)}${' '.repeat(paddingNeeded)} ${vertical}`);
      }

      // Spacing between specs
      if (i < specs.length - 1) {
        console.log(`${vertical}${' '.repeat(width + 2)}${vertical}`);
      }
    }
  } else if (!expanded && specs.length > 0) {
    const message = '(collapsed, use --show-complete to expand)';
    console.log(`${vertical} ${chalk.dim(message)}${' '.repeat(Math.max(0, width - message.length))} ${vertical}`);
  } else {
    const message = '(no specs)';
    console.log(`${vertical} ${chalk.dim(message)}${' '.repeat(Math.max(0, width - message.length))} ${vertical}`);
  }

  // Bottom border
  console.log(`${bottomLeft}${horizontal.repeat(width + 2)}${bottomRight}`);
  console.log('');
}
