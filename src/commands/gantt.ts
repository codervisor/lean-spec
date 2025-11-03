import chalk from 'chalk';
import dayjs from 'dayjs';
import { loadAllSpecs } from '../spec-loader.js';
import type { SpecInfo } from '../spec-loader.js';
import type { SpecStatus } from '../frontmatter.js';
import { withSpinner } from '../utils/ui.js';
import { autoCheckIfEnabled } from './check.js';

const STATUS_CONFIG: Record<SpecStatus, { emoji: string; color: string }> = {
  planned: { emoji: '📋', color: 'gray' },
  'in-progress': { emoji: '⚡', color: 'yellow' },
  complete: { emoji: '✅', color: 'green' },
  archived: { emoji: '📦', color: 'gray' },
};

const PRIORITY_BADGES: Record<string, { text: string; colorFn: (s: string) => string }> = {
  critical: { text: '[CRITICAL]', colorFn: chalk.red },
  high: { text: '[HIGH]', colorFn: chalk.hex('#FFA500') },
  medium: { text: '[MED]', colorFn: chalk.yellow },
  low: { text: '[LOW]', colorFn: chalk.green },
};

export async function ganttCommand(options: {
  weeks?: number;
  showComplete?: boolean;
  criticalPath?: boolean;
}): Promise<void> {
  // Auto-check for conflicts before display
  await autoCheckIfEnabled();
  
  const weeks = options.weeks || 4;
  
  // Load all specs with spinner
  const specs = await withSpinner(
    'Loading specs...',
    () => loadAllSpecs({
      includeArchived: false,
    })
  );

  if (specs.length === 0) {
    console.log('No specs found.');
    return;
  }

  // Filter relevant specs
  const relevantSpecs = specs.filter(spec => {
    // Hide completed specs unless explicitly requested
    if (!options.showComplete && spec.frontmatter.status === 'complete') {
      return false;
    }
    // Show all non-archived specs (planned, in-progress, complete with flag)
    return spec.frontmatter.status !== 'archived';
  });

  if (relevantSpecs.length === 0) {
    console.log(chalk.dim('No active specs found.'));
    console.log(chalk.dim('Tip: Use --show-complete to include completed specs.'));
    return;
  }

  // Sort specs by priority, dependencies, due date, then status
  const sortedSpecs = [...relevantSpecs].sort((a, b) => {
    // Dependencies first
    if (a.frontmatter.depends_on?.length && !b.frontmatter.depends_on?.length) return -1;
    if (!a.frontmatter.depends_on?.length && b.frontmatter.depends_on?.length) return 1;
    
    // Then by due date
    if (a.frontmatter.due && !b.frontmatter.due) return -1;
    if (!a.frontmatter.due && b.frontmatter.due) return 1;
    if (a.frontmatter.due && b.frontmatter.due) {
      return dayjs(a.frontmatter.due).diff(dayjs(b.frontmatter.due));
    }
    
    // Then by status
    const statusOrder = { 'in-progress': 0, 'planned': 1, 'complete': 2 };
    return (statusOrder[a.frontmatter.status as keyof typeof statusOrder] || 3) - 
           (statusOrder[b.frontmatter.status as keyof typeof statusOrder] || 3);
  });

  // Calculate date range
  const today = dayjs();
  const startDate = today.startOf('week');
  const endDate = startDate.add(weeks, 'week');

  // Calculate stats
  const inProgress = relevantSpecs.filter(s => s.frontmatter.status === 'in-progress').length;
  const planned = relevantSpecs.filter(s => s.frontmatter.status === 'planned').length;
  const complete = relevantSpecs.filter(s => s.frontmatter.status === 'complete').length;
  const overdue = relevantSpecs.filter(s => 
    s.frontmatter.due && 
    dayjs(s.frontmatter.due).isBefore(today) && 
    s.frontmatter.status !== 'complete'
  ).length;

  // Display header
  console.log(chalk.bold.cyan('📅 Gantt Chart'));
  console.log(chalk.dim(`Showing ${weeks} weeks from ${startDate.format('MMM D, YYYY')}`));
  console.log('');

  // Legend
  console.log(chalk.bold('Legend:'));
  console.log(`${chalk.green('■')} Complete   ${chalk.yellow('■')} In Progress   ${chalk.dim('□')} Planned   ${chalk.red('▸')} Due Date   ${chalk.blue('○')} Today`);
  console.log('');

  // Timeline header - each week is 8 chars wide
  const headerParts: string[] = [];
  for (let i = 0; i < weeks; i++) {
    const date = startDate.add(i, 'week');
    const dateStr = date.format('MMM D').padEnd(8);
    
    if (today.isSame(date, 'week')) {
      headerParts.push(chalk.bold.blue(dateStr));
    } else {
      headerParts.push(chalk.dim(dateStr));
    }
  }
  console.log(headerParts.join(''));
  
  // Separator line - matches header spacing exactly (8 chars per week)
  const separatorParts: string[] = [];
  for (let i = 0; i < weeks; i++) {
    separatorParts.push('────────'); // 8 horizontal lines
  }
  console.log(chalk.dim(separatorParts.join('')));
  console.log('');

  // Display each spec
  for (const spec of sortedSpecs) {
    renderSpecTimeline(spec, specs, startDate, endDate, weeks, today);
    console.log('');
  }

  // Summary
  console.log(chalk.bold('Summary: ') + 
    chalk.yellow(`In Progress: ${inProgress}  `) +
    chalk.cyan(`Planned: ${planned}  `) +
    chalk.green(`Complete: ${complete}`) +
    (overdue > 0 ? chalk.red(`  ⚠ Overdue: ${overdue}`) : '')
  );
}

function renderSpecTimeline(
  spec: SpecInfo,
  allSpecs: SpecInfo[],
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  weeks: number,
  today: dayjs.Dayjs
): void {
  const statusConfig = STATUS_CONFIG[spec.frontmatter.status];
  const priorityBadge = spec.frontmatter.priority ? PRIORITY_BADGES[spec.frontmatter.priority] : null;

  // Spec name with status and priority
  let nameRow = `${statusConfig.emoji} ${chalk.bold.cyan(spec.path)}`;
  if (priorityBadge) {
    nameRow += ' ' + priorityBadge.colorFn(priorityBadge.text);
  }
  console.log(nameRow);

  // Dependencies
  if (spec.frontmatter.depends_on && spec.frontmatter.depends_on.length > 0) {
    const depParts: string[] = [chalk.dim('  ↳ depends on: ')];
    spec.frontmatter.depends_on.forEach((dep, idx) => {
      const depSpec = allSpecs.find(s => s.path === dep || s.path.includes(dep));
      const icon = depSpec?.frontmatter.status === 'complete' ? '✓' : '○';
      const iconColor = depSpec?.frontmatter.status === 'complete' ? chalk.green : chalk.yellow;
      
      depParts.push(iconColor(icon) + chalk.dim(` ${dep}`));
      if (idx < spec.frontmatter.depends_on!.length - 1) {
        depParts.push(chalk.dim(', '));
      }
    });
    console.log(depParts.join(''));
  }

  // Timeline bar
  const bar = renderTimelineBar(spec, startDate, endDate, weeks, today);
  console.log(bar);

  // Metadata
  const metaParts: string[] = [chalk.dim(`  ${statusConfig.emoji} ${spec.frontmatter.status}`)];
  
  if (spec.frontmatter.created) {
    const createdDate = dayjs(spec.frontmatter.created).format('YYYY-MM-DD');
    metaParts.push(chalk.dim(` · created: ${createdDate}`));
  }
  
  if (spec.frontmatter.due) {
    const dueDate = dayjs(spec.frontmatter.due);
    const isOverdue = dueDate.isBefore(today) && spec.frontmatter.status !== 'complete';
    if (isOverdue) {
      metaParts.push(chalk.red(` · due: ${spec.frontmatter.due} ⚠`));
    } else {
      metaParts.push(chalk.dim(` · due: ${spec.frontmatter.due}`));
    }
  }
  
  if (spec.frontmatter.completed) {
    const completedDate = dayjs(spec.frontmatter.completed).format('YYYY-MM-DD');
    metaParts.push(chalk.green(` · completed: ${completedDate}`));
  }
  
  console.log(metaParts.join(''));
}

function renderTimelineBar(
  spec: SpecInfo,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  weeks: number,
  today: dayjs.Dayjs
): string {
  const charsPerWeek = 8;
  const totalChars = weeks * charsPerWeek;
  
  const created = dayjs(spec.frontmatter.created);
  const due = spec.frontmatter.due ? dayjs(spec.frontmatter.due) : null;
  const completed = spec.frontmatter.completed ? dayjs(spec.frontmatter.completed) : null;
  
  let specStart = created;
  let specEnd = due || completed;
  
  // If no end date and not complete, estimate 2 weeks
  if (!specEnd && spec.frontmatter.status !== 'complete') {
    specEnd = created.add(2, 'week');
  }
  
  // Simple point marker if no end date
  if (!specEnd) {
    const daysFromStart = created.diff(startDate, 'day');
    const position = Math.floor((daysFromStart / 7) * charsPerWeek);
    
    if (position >= 0 && position < totalChars) {
      return ' '.repeat(position) + chalk.cyan('■') + ' '.repeat(totalChars - position - 1);
    }
    return ' '.repeat(totalChars);
  }
  
  // Calculate bar position
  const startDaysFromStart = specStart.diff(startDate, 'day');
  const endDaysFromStart = specEnd.diff(startDate, 'day');
  
  const startPos = Math.floor((startDaysFromStart / 7) * charsPerWeek);
  const endPos = Math.floor((endDaysFromStart / 7) * charsPerWeek);
  
  const barStart = Math.max(0, startPos);
  const barEnd = Math.min(totalChars, endPos);
  const barLength = Math.max(1, barEnd - barStart);
  
  // Calculate marker positions
  const todayDays = today.diff(startDate, 'day');
  const todayPos = Math.floor((todayDays / 7) * charsPerWeek);
  const duePos = due ? Math.floor((due.diff(startDate, 'day') / 7) * charsPerWeek) : -1;
  
  // Build bar string
  let result = '';
  
  // Leading space (with today marker if applicable)
  if (barStart > 0) {
    if (todayPos >= 0 && todayPos < barStart) {
      result += ' '.repeat(todayPos) + chalk.blue('○') + ' '.repeat(barStart - todayPos - 1);
    } else {
      result += ' '.repeat(barStart);
    }
  }
  
  // Bar content based on status
  if (spec.frontmatter.status === 'complete') {
    // Solid green bar for completed
    if (duePos >= barStart && duePos < barEnd) {
      result += chalk.green('■'.repeat(duePos - barStart));
      result += chalk.red('▸');
      result += chalk.green('■'.repeat(barEnd - duePos - 1));
    } else {
      result += chalk.green('■'.repeat(barLength));
      if (duePos === barEnd) {
        result += chalk.red('▸');
      }
    }
  } else if (spec.frontmatter.status === 'in-progress') {
    // Half-filled yellow bar for in-progress
    const halfLength = Math.floor(barLength / 2);
    result += chalk.yellow('■'.repeat(halfLength));
    result += chalk.dim('□'.repeat(barLength - halfLength));
    if (duePos === barEnd) {
      result += chalk.red('▸');
    }
  } else {
    // Empty gray bar for planned
    result += chalk.dim('□'.repeat(barLength));
    if (duePos === barEnd) {
      result += chalk.red('▸');
    }
  }
  
  // Trailing space (with today marker if applicable)
  const trailingStart = barEnd + (duePos === barEnd ? 1 : 0);
  const trailingSpace = totalChars - trailingStart;
  if (trailingSpace > 0) {
    if (todayPos >= trailingStart && todayPos < totalChars) {
      const beforeToday = todayPos - trailingStart;
      const afterToday = totalChars - todayPos - 1;
      if (beforeToday > 0) result += ' '.repeat(beforeToday);
      result += chalk.blue('○');
      if (afterToday > 0) result += ' '.repeat(afterToday);
    } else {
      result += ' '.repeat(trailingSpace);
    }
  }
  
  return result;
}
