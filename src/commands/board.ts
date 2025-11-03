import chalk from 'chalk';
import { loadAllSpecs } from '../spec-loader.js';
import type { SpecInfo } from '../spec-loader.js';
import type { SpecFilterOptions, SpecStatus, SpecPriority } from '../frontmatter.js';
import { withSpinner } from '../utils/ui.js';
import { autoCheckIfEnabled } from './check.js';

const STATUS_CONFIG: Record<SpecStatus, { emoji: string; label: string; colorFn: (s: string) => string }> = {
  planned: { emoji: '📋', label: 'Planned', colorFn: chalk.cyan },
  'in-progress': { emoji: '⚡', label: 'In Progress', colorFn: chalk.yellow },
  complete: { emoji: '✅', label: 'Complete', colorFn: chalk.green },
  archived: { emoji: '📦', label: 'Archived', colorFn: chalk.dim },
};

const PRIORITY_BADGES: Record<SpecPriority, { emoji: string; colorFn: (s: string) => string }> = {
  critical: { emoji: '🔴', colorFn: chalk.red },
  high: { emoji: '🟠', colorFn: chalk.hex('#FFA500') },
  medium: { emoji: '🟡', colorFn: chalk.yellow },
  low: { emoji: '🟢', colorFn: chalk.green },
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
    console.log(chalk.dim('No specs found.'));
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
  const width = 60;
  const count = specs.length;
  const header = `${emoji} ${title} (${count})`;
  
  // Ensure consistent box width
  const boxContent = width + 4; // +4 for padding and borders (│ + space + space + │)

  // Top border
  console.log(colorFn(`┌─ ${chalk.bold(header)} ${('─').repeat(Math.max(0, width - header.length - 2))}┐`));

  // Content
  if (expanded && specs.length > 0) {
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      
      // Spec name - truncate if needed
      const specNameDisplay = spec.path.length > width - 4 ? spec.path.substring(0, width - 5) + '…' : spec.path;
      const namePadding = width - specNameDisplay.length;
      console.log(`│ ${chalk.bold.cyan(specNameDisplay)}${' '.repeat(namePadding)} │`);

      // Metadata line with tags, priority, and assignee
      const metaParts: string[] = [];
      
      if (spec.frontmatter.tags?.length) {
        const tagStr = spec.frontmatter.tags.map(tag => `#${tag}`).join(' ');
        metaParts.push(chalk.magenta(tagStr));
      }
      
      if (spec.frontmatter.priority) {
        const badge = PRIORITY_BADGES[spec.frontmatter.priority];
        const priorityStr = `${badge.emoji} ${spec.frontmatter.priority}`;
        metaParts.push(badge.colorFn(priorityStr));
      }
      
      if (spec.frontmatter.assignee) {
        metaParts.push(chalk.cyan(`@${spec.frontmatter.assignee}`));
      }
      
      if (metaParts.length > 0) {
        const metaJoined = metaParts.join(' · ');
        // Calculate visible length (without ANSI codes)
        const visibleLength = stripAnsi(metaJoined).length;
        const metaDisplay = visibleLength > width - 4 ? stripAnsi(metaJoined).substring(0, width - 5) + '…' : metaJoined;
        const metaPadding = width - stripAnsi(metaDisplay).length;
        console.log(`│ ${metaDisplay}${' '.repeat(Math.max(0, metaPadding))} │`);
      }

      // Divider between specs
      if (i < specs.length - 1) {
        console.log(`├${('─').repeat(width + 2)}┤`);
      }
    }
  } else if (!expanded && specs.length > 0) {
    const message = '(collapsed, use --show-complete to expand)';
    const padding = width - message.length;
    console.log(`│ ${chalk.dim(message)}${' '.repeat(padding)} │`);
  } else {
    const message = '(empty)';
    const padding = width - message.length;
    console.log(`│ ${chalk.dim(message)}${' '.repeat(padding)} │`);
  }

  // Bottom border
  console.log(`└${('─').repeat(width + 2)}┘`);
  console.log('');
}

// Helper function to strip ANSI codes for accurate length calculation
function stripAnsi(str: string): string {
  return str.replace(/\u001b\[\d+m/g, '');
}
