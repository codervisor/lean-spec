import chalk from 'chalk';
import { loadAllSpecs } from '../spec-loader.js';
import type { SpecInfo } from '../spec-loader.js';
import type { SpecFilterOptions, SpecStatus, SpecPriority } from '../frontmatter.js';
import { withSpinner } from '../utils/ui.js';
import { autoCheckIfEnabled } from './check.js';
import { sanitizeUserInput } from '../utils/ui.js';
import { calculateCompletion, getCompletionStatus } from '../utils/completion.js';
import { calculateVelocityMetrics } from '../utils/velocity.js';

const STATUS_CONFIG: Record<SpecStatus, { emoji: string; label: string; colorFn: (s: string) => string }> = {
  planned: { emoji: '📅', label: 'Planned', colorFn: chalk.cyan },
  'in-progress': { emoji: '⏳', label: 'In Progress', colorFn: chalk.yellow },
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
  simple?: boolean;
  completionOnly?: boolean;
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

  // Show completion summary unless --simple flag is set
  if (!options.simple) {
    const completionMetrics = calculateCompletion(specs);
    const velocityMetrics = calculateVelocityMetrics(specs);
    const completionStatus = getCompletionStatus(completionMetrics.score);
    
    // Health summary box
    const boxWidth = 62;
    const topBorder = '╔' + '═'.repeat(boxWidth - 2) + '╗';
    const bottomBorder = '╚' + '═'.repeat(boxWidth - 2) + '╝';
    
    // Helper to pad line with ANSI code awareness
    const padLine = (content: string): string => {
      const visibleLength = stripAnsi(content).length;
      const padding = boxWidth - 2 - visibleLength;
      return content + ' '.repeat(Math.max(0, padding));
    };
    
    console.log(chalk.dim(topBorder));
    
    const headerLine = chalk.bold('  Project Overview');
    console.log(chalk.dim('║') + padLine(headerLine) + chalk.dim('║'));
    
    // Completion rate percentage
    const percentageColor = completionMetrics.score >= 70 ? chalk.green : 
                           completionMetrics.score >= 40 ? chalk.yellow : 
                           chalk.red;
    
    const line1 = `  ${completionMetrics.totalSpecs} total · ${completionMetrics.activeSpecs} active · ${completionMetrics.completeSpecs} complete ${percentageColor('(' + completionMetrics.score + '%)')}`;
    console.log(chalk.dim('║') + padLine(line1) + chalk.dim('║'));
    
    // Alerts line
    if (completionMetrics.criticalIssues.length > 0 || completionMetrics.warnings.length > 0) {
      const alerts: string[] = [];
      if (completionMetrics.criticalIssues.length > 0) {
        alerts.push(`${completionMetrics.criticalIssues.length} critical overdue`);
      }
      if (completionMetrics.warnings.length > 0) {
        alerts.push(`${completionMetrics.warnings.length} specs WIP > 7 days`);
      }
      const alertLine = `  ${chalk.yellow('⚠️  ' + alerts.join(' · '))}`;
      console.log(chalk.dim('║') + padLine(alertLine) + chalk.dim('║'));
    }
    
    // Velocity line
    const velocityLine = `  ${chalk.cyan('🚀 Velocity:')} ${velocityMetrics.cycleTime.average.toFixed(1)}d avg cycle · ${(velocityMetrics.throughput.perWeek / 7 * 7).toFixed(1)}/wk throughput`;
    console.log(chalk.dim('║') + padLine(velocityLine) + chalk.dim('║'));
    
    console.log(chalk.dim(bottomBorder));
    console.log('');

    // If --completion-only, stop here
    if (options.completionOnly) {
      return;
    }
  }  // Render columns
  renderColumn(STATUS_CONFIG.planned.label, STATUS_CONFIG.planned.emoji, columns.planned, true, STATUS_CONFIG.planned.colorFn);
  
  // Separator between status sections
  console.log(chalk.dim('━'.repeat(70)));
  console.log('');
  
  renderColumn(STATUS_CONFIG['in-progress'].label, STATUS_CONFIG['in-progress'].emoji, columns['in-progress'], true, STATUS_CONFIG['in-progress'].colorFn);
  
  // Separator between status sections
  console.log(chalk.dim('━'.repeat(70)));
  console.log('');
  
  renderColumn(STATUS_CONFIG.complete.label, STATUS_CONFIG.complete.emoji, columns.complete, options.showComplete || false, STATUS_CONFIG.complete.colorFn);
}

function renderColumn(
  title: string,
  emoji: string,
  specs: SpecInfo[],
  expanded: boolean,
  colorFn: (s: string) => string
): void {
  // Column header
  console.log(`${emoji} ${colorFn(chalk.bold(`${title} (${specs.length})`))}`);
  console.log('');

  if (expanded && specs.length > 0) {
    // Group specs by priority
    const priorityGroups: Record<string, SpecInfo[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      none: []
    };

    for (const spec of specs) {
      const priority = spec.frontmatter.priority || 'none';
      priorityGroups[priority].push(spec);
    }

    // Render each priority group
    const priorityOrder: Array<keyof typeof priorityGroups> = ['critical', 'high', 'medium', 'low', 'none'];
    let firstGroup = true;

    for (const priority of priorityOrder) {
      const groupSpecs = priorityGroups[priority];
      if (groupSpecs.length === 0) continue;

      // Add spacing between groups
      if (!firstGroup) {
        console.log('');
      }
      firstGroup = false;

      // Priority group header - minimal, modern style
      const priorityLabel = priority === 'none' ? 'No Priority' : priority.charAt(0).toUpperCase() + priority.slice(1);
      const priorityEmoji = priority === 'none' ? '⚪' : PRIORITY_BADGES[priority as SpecPriority].emoji;
      const priorityColor = priority === 'none' ? chalk.dim : PRIORITY_BADGES[priority as SpecPriority].colorFn;
      
      console.log(`  ${priorityColor(`${priorityEmoji} ${chalk.bold(priorityLabel)} ${chalk.dim(`(${groupSpecs.length})`)}`)}`);;

      for (const spec of groupSpecs) {
        // Build spec line with metadata
        let assigneeStr = '';
        if (spec.frontmatter.assignee) {
          assigneeStr = ' ' + chalk.cyan(`@${sanitizeUserInput(spec.frontmatter.assignee)}`);
        }
        
        let tagsStr = '';
        if (spec.frontmatter.tags?.length) {
          // Defensive check: ensure tags is an array
          const tags = Array.isArray(spec.frontmatter.tags) ? spec.frontmatter.tags : [];
          if (tags.length > 0) {
            const tagStr = tags.map(tag => `#${sanitizeUserInput(tag)}`).join(' ');
            tagsStr = ' ' + chalk.dim(chalk.magenta(tagStr));
          }
        }

        console.log(`    ${chalk.cyan(sanitizeUserInput(spec.path))}${assigneeStr}${tagsStr}`);
      }
    }

    console.log('');
  } else if (!expanded && specs.length > 0) {
    console.log(`  ${chalk.dim('(collapsed, use --show-complete to expand)')}`);
    console.log('');
  } else {
    console.log(`  ${chalk.dim('(empty)')}`);
    console.log('');
  }
}

// Helper function to strip ANSI codes for accurate length calculation
function stripAnsi(str: string): string {
  return str.replace(/\u001b\[\d+m/g, '');
}
