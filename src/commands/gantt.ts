import chalk from 'chalk';
import dayjs from 'dayjs';
import { loadAllSpecs } from '../spec-loader.js';
import type { SpecInfo } from '../spec-loader.js';
import type { SpecStatus, SpecPriority } from '../frontmatter.js';
import { withSpinner } from '../utils/ui.js';
import { autoCheckIfEnabled } from './check.js';

// Column width constants (aligned with stats.ts and timeline.ts)
const SPEC_COLUMN_WIDTH = 43;  // Includes status emoji + 1 space + spec name
const COLUMN_SEPARATOR = '  '; // 2 spaces between columns
const SPEC_INDENT = '  '; // 2 spaces for spec indentation within priority groups

// Timeline bar characters
const FILLED_BAR_CHAR = '█';
const EMPTY_BAR_CHAR = '░';

const STATUS_CONFIG: Record<SpecStatus, { emoji: string; color: string }> = {
  planned: { emoji: '📋', color: 'gray' },
  'in-progress': { emoji: '⚡', color: 'yellow' },
  complete: { emoji: '✅', color: 'green' },
  archived: { emoji: '📦', color: 'gray' },
};

const PRIORITY_CONFIG: Record<SpecPriority, { emoji: string; label: string; colorFn: (s: string) => string }> = {
  critical: { emoji: '🔴', label: 'CRITICAL', colorFn: chalk.red },
  high: { emoji: '🟠', label: 'HIGH', colorFn: chalk.hex('#FFA500') },
  medium: { emoji: '🟡', label: 'MEDIUM', colorFn: chalk.yellow },
  low: { emoji: '🟢', label: 'LOW', colorFn: chalk.green },
};

export async function ganttCommand(options: {
  weeks?: number;
  showComplete?: boolean;
  criticalPath?: boolean;
}): Promise<void> {
  // Auto-check for conflicts before display
  await autoCheckIfEnabled();
  
  const weeks = options.weeks || 4;
  const timelineColumnWidth = weeks * 8; // 8 chars per week
  
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

  // Group specs by priority
  const groupedSpecs: Record<SpecPriority, SpecInfo[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };
  
  const noPrioritySpecs: SpecInfo[] = [];
  
  for (const spec of relevantSpecs) {
    if (spec.frontmatter.priority && spec.frontmatter.priority in groupedSpecs) {
      groupedSpecs[spec.frontmatter.priority].push(spec);
    } else {
      noPrioritySpecs.push(spec);
    }
  }
  
  // Sort specs within each group by status (in-progress first), then by due date
  const sortSpecs = (specs: SpecInfo[]) => {
    return [...specs].sort((a, b) => {
      const statusOrder = { 'in-progress': 0, 'planned': 1, 'complete': 2 };
      const aOrder = statusOrder[a.frontmatter.status as keyof typeof statusOrder] ?? 3;
      const bOrder = statusOrder[b.frontmatter.status as keyof typeof statusOrder] ?? 3;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      if (a.frontmatter.due && !b.frontmatter.due) return -1;
      if (!a.frontmatter.due && b.frontmatter.due) return 1;
      if (a.frontmatter.due && b.frontmatter.due) {
        return dayjs(a.frontmatter.due).diff(dayjs(b.frontmatter.due));
      }
      
      return 0;
    });
  };

  // Calculate date range (start from today)
  const today = dayjs();
  const startDate = today.startOf('week');
  const endDate = startDate.add(weeks, 'week');

  // Calculate stats
  const inProgress = relevantSpecs.filter(s => s.frontmatter.status === 'in-progress').length;
  const planned = relevantSpecs.filter(s => s.frontmatter.status === 'planned').length;
  const overdue = relevantSpecs.filter(s => 
    s.frontmatter.due && 
    dayjs(s.frontmatter.due).isBefore(today) && 
    s.frontmatter.status !== 'complete'
  ).length;

  // Display header
  console.log(chalk.bold.cyan(`📅 Gantt Chart (${weeks} weeks from ${startDate.format('MMM D, YYYY')})`));
  console.log('');

  // Column headers
  const specHeader = 'Spec'.padEnd(SPEC_COLUMN_WIDTH);
  const timelineHeader = 'Timeline';
  console.log(specHeader + COLUMN_SEPARATOR + timelineHeader);
  
  // Calendar dates in timeline header (right-aligned to column)
  const calendarDates: string[] = [];
  for (let i = 0; i < weeks; i++) {
    const date = startDate.add(i, 'week');
    const dateStr = date.format('MMM D').padEnd(8);
    calendarDates.push(dateStr);
  }
  const dateRow = ' '.repeat(SPEC_COLUMN_WIDTH) + COLUMN_SEPARATOR + calendarDates.join('');
  console.log(chalk.dim(dateRow));
  
  // Separator line
  const specSeparator = '─'.repeat(SPEC_COLUMN_WIDTH);
  const timelineSeparator = '─'.repeat(timelineColumnWidth);
  console.log(chalk.dim(specSeparator + COLUMN_SEPARATOR + timelineSeparator));
  
  // Today marker (aligned to current week)
  const todayWeekOffset = today.diff(startDate, 'week');
  const todayMarkerPos = todayWeekOffset * 8;
  let todayMarker = ' '.repeat(SPEC_COLUMN_WIDTH) + COLUMN_SEPARATOR;
  if (todayMarkerPos >= 0 && todayMarkerPos < timelineColumnWidth) {
    todayMarker += ' '.repeat(todayMarkerPos) + '│ Today';
  }
  console.log(chalk.dim(todayMarker));
  console.log('');

  // Display priority groups
  const priorities: SpecPriority[] = ['critical', 'high', 'medium', 'low'];
  
  for (const priority of priorities) {
    const specsInGroup = sortSpecs(groupedSpecs[priority]);
    const config = PRIORITY_CONFIG[priority];
    
    // Always show priority header with count
    console.log(config.colorFn(`${config.emoji} ${config.label} (${specsInGroup.length})`));
    
    // Display specs in this priority group
    if (specsInGroup.length > 0) {
      for (const spec of specsInGroup) {
        renderSpecRow(spec, startDate, endDate, weeks, today);
      }
    }
    
    console.log('');
  }

  // Summary
  const summaryParts: string[] = [];
  if (inProgress > 0) summaryParts.push(`${inProgress} in-progress`);
  if (planned > 0) summaryParts.push(`${planned} planned`);
  if (overdue > 0) summaryParts.push(chalk.red(`${overdue} overdue`));
  
  console.log(chalk.bold('Summary: ') + summaryParts.join(' · '));
  console.log(chalk.dim('💡 Tip: Add "due: YYYY-MM-DD" to frontmatter for timeline planning'));
}

function renderSpecRow(
  spec: SpecInfo,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  weeks: number,
  today: dayjs.Dayjs
): void {
  const statusConfig = STATUS_CONFIG[spec.frontmatter.status];
  const timelineColumnWidth = weeks * 8;
  
  // Format spec name with status emoji
  // Format: {emoji} {spec-name} (must be exactly SPEC_COLUMN_WIDTH chars)
  const emoji = statusConfig.emoji;
  const maxNameLength = SPEC_COLUMN_WIDTH - 2; // 2 chars for emoji + space
  let specName = spec.name; // Use spec.name instead of spec.path
  
  // Truncate name if too long
  if (specName.length > maxNameLength) {
    specName = specName.substring(0, maxNameLength - 1) + '…';
  }
  
  const specColumn = `${SPEC_INDENT}${emoji} ${specName}`.padEnd(SPEC_COLUMN_WIDTH);
  
  // Build timeline column
  let timelineColumn: string;
  
  if (!spec.frontmatter.due) {
    // No due date set
    timelineColumn = chalk.dim('(no due date set)');
  } else {
    // Render timeline bar
    timelineColumn = renderTimelineBar(spec, startDate, endDate, weeks, today);
  }
  
  console.log(specColumn + COLUMN_SEPARATOR + timelineColumn);
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
  
  const due = dayjs(spec.frontmatter.due!);
  const specStart = today; // Start from today, not creation date
  
  // Calculate bar position
  const startDaysFromStart = specStart.diff(startDate, 'day');
  const dueDaysFromStart = due.diff(startDate, 'day');
  
  const startPos = Math.max(0, Math.floor((startDaysFromStart / 7) * charsPerWeek));
  const duePos = Math.floor((dueDaysFromStart / 7) * charsPerWeek);
  
  // Clamp to visible range
  const barStart = Math.max(0, startPos);
  const barEnd = Math.min(totalChars, Math.max(barStart, duePos));
  const barLength = Math.max(0, barEnd - barStart);
  
  // Build bar string
  let result = '';
  
  // Leading space
  if (barStart > 0) {
    result += ' '.repeat(barStart);
  }
  
  // Bar content based on status
  if (spec.frontmatter.status === 'complete') {
    result += chalk.green(FILLED_BAR_CHAR.repeat(barLength));
  } else if (spec.frontmatter.status === 'in-progress') {
    // Half-filled bar
    const halfLength = Math.floor(barLength / 2);
    result += chalk.yellow(FILLED_BAR_CHAR.repeat(halfLength));
    result += chalk.dim(EMPTY_BAR_CHAR.repeat(barLength - halfLength));
  } else {
    // Planned - empty bar
    result += chalk.dim(EMPTY_BAR_CHAR.repeat(barLength));
  }
  
  // Trailing space
  const trailingSpace = totalChars - barEnd;
  if (trailingSpace > 0) {
    result += ' '.repeat(trailingSpace);
  }
  
  return result;
}
