import chalk from 'chalk';
import dayjs from 'dayjs';
import { loadAllSpecs } from '../spec-loader.js';
import type { SpecInfo } from '../spec-loader.js';
import type { SpecStatus } from '../frontmatter.js';
import { withSpinner } from '../utils/ui.js';
import { autoCheckIfEnabled } from './check.js';

// Column width constants for consistent alignment
const SPEC_COLUMN_WIDTH = 43;
const COLUMN_SEPARATOR = '  ';

const STATUS_CONFIG: Record<SpecStatus, { emoji: string; color: string }> = {
  planned: { emoji: '📋', color: 'gray' },
  'in-progress': { emoji: '⚡', color: 'yellow' },
  complete: { emoji: '✅', color: 'green' },
  archived: { emoji: '📦', color: 'gray' },
};

const PRIORITY_CONFIG = {
  critical: { emoji: '🔴', text: 'CRITICAL', color: chalk.red },
  high: { emoji: '🟠', text: 'HIGH', color: chalk.hex('#FFA500') },
  medium: { emoji: '🟡', text: 'MEDIUM', color: chalk.yellow },
  low: { emoji: '🟢', text: 'LOW', color: chalk.green },
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
  const specs = await withSpinner('Loading specs...', () =>
    loadAllSpecs({
      includeArchived: false,
    })
  );

  if (specs.length === 0) {
    console.log('No specs found.');
    return;
  }

  // Filter relevant specs
  const relevantSpecs = specs.filter((spec) => {
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
  const DEFAULT_PRIORITY = 'medium';
  const specsByPriority: Record<string, SpecInfo[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  for (const spec of relevantSpecs) {
    const priority = spec.frontmatter.priority || DEFAULT_PRIORITY;
    if (specsByPriority[priority]) {
      specsByPriority[priority].push(spec);
    } else {
      specsByPriority[DEFAULT_PRIORITY].push(spec);
    }
  }

  // Sort specs within each priority group by due date, then status
  for (const priority in specsByPriority) {
    specsByPriority[priority].sort((a, b) => {
      // Due dates first
      if (a.frontmatter.due && !b.frontmatter.due) return -1;
      if (!a.frontmatter.due && b.frontmatter.due) return 1;
      if (a.frontmatter.due && b.frontmatter.due) {
        return dayjs(a.frontmatter.due).diff(dayjs(b.frontmatter.due));
      }

      // Then by status
      const statusOrder = { 'in-progress': 0, planned: 1, complete: 2 };
      return (
        (statusOrder[a.frontmatter.status as keyof typeof statusOrder] || 3) -
        (statusOrder[b.frontmatter.status as keyof typeof statusOrder] || 3)
      );
    });
  }

  // Calculate date range - start from today
  const today = dayjs();
  const startDate = today.startOf('week');
  const endDate = startDate.add(weeks, 'week');

  // Calculate stats
  const inProgress = relevantSpecs.filter((s) => s.frontmatter.status === 'in-progress').length;
  const planned = relevantSpecs.filter((s) => s.frontmatter.status === 'planned').length;
  const overdue = relevantSpecs.filter(
    (s) =>
      s.frontmatter.due &&
      dayjs(s.frontmatter.due).isBefore(today) &&
      s.frontmatter.status !== 'complete'
  ).length;

  // Display header
  console.log(
    chalk.bold.cyan(`📅 Gantt Chart (${weeks} weeks from ${startDate.format('MMM D, YYYY')})`)
  );
  console.log('');

  // Column headers
  console.log(`${'Spec'.padEnd(SPEC_COLUMN_WIDTH)}${COLUMN_SEPARATOR}Timeline`);

  // Build timeline header with dates
  const timelineHeader: string[] = [];
  for (let i = 0; i < weeks; i++) {
    const date = startDate.add(i, 'week');
    const dateStr = date.format('MMM D').padEnd(8);
    timelineHeader.push(dateStr);
  }
  const separator = '─'.repeat(SPEC_COLUMN_WIDTH);
  const timelineSeparator = '─'.repeat(timelineColumnWidth);
  console.log(`${separator}${COLUMN_SEPARATOR}${timelineHeader.join('')}`);
  console.log(`${separator}${COLUMN_SEPARATOR}${timelineSeparator}`);

  // Add "Today" marker line
  const todayPos = getTodayPosition(startDate, today, weeks);
  if (todayPos >= 0 && todayPos < timelineColumnWidth) {
    const todayLine = ' '.repeat(todayPos) + '│ Today';
    console.log(`${' '.repeat(SPEC_COLUMN_WIDTH)}${COLUMN_SEPARATOR}${todayLine}`);
  }
  console.log('');

  // Display specs grouped by priority
  for (const [priority, prioritySpecs] of Object.entries(specsByPriority)) {
    if (prioritySpecs.length === 0) continue;

    const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];
    console.log(
      config.color(`${config.emoji} ${config.text.toUpperCase()} (${prioritySpecs.length})`)
    );

    for (const spec of prioritySpecs) {
      renderSpecRow(spec, startDate, weeks, today, timelineColumnWidth);
    }

    console.log('');
  }

  // Summary
  const summaryParts: string[] = [];
  if (inProgress > 0) summaryParts.push(`${inProgress} in-progress`);
  if (planned > 0) summaryParts.push(`${planned} planned`);
  if (overdue > 0) summaryParts.push(chalk.red(`${overdue} overdue`));

  console.log(chalk.bold('Summary: ') + summaryParts.join(' · '));

  // Add helpful tip about due dates
  const specsWithoutDueDate = relevantSpecs.filter((s) => !s.frontmatter.due).length;
  if (specsWithoutDueDate > 0) {
    console.log(chalk.dim(`💡 Tip: Add "due: YYYY-MM-DD" to frontmatter for timeline planning`));
  }
}

function getTodayPosition(startDate: dayjs.Dayjs, today: dayjs.Dayjs, weeks: number): number {
  const charsPerWeek = 8;
  const daysFromStart = today.diff(startDate, 'day');
  return Math.floor((daysFromStart / 7) * charsPerWeek);
}

function formatSpecName(spec: SpecInfo): string {
  const statusConfig = STATUS_CONFIG[spec.frontmatter.status];
  const emoji = statusConfig.emoji;
  const name = spec.path;

  // Format: {emoji} {name}
  // Total width should be exactly SPEC_COLUMN_WIDTH
  // Note: We assume emoji width is 1 for consistent terminal display
  // Some terminals may display emojis as 2 chars wide, but this is handled
  // by the terminal itself and doesn't affect our string length calculations
  const prefix = `${emoji} `;
  const prefixLen = 2; // emoji (1) + space (1)
  const maxNameLen = SPEC_COLUMN_WIDTH - prefixLen;

  let displayName = name;
  if (name.length > maxNameLen) {
    displayName = name.substring(0, maxNameLen - 1) + '…';
  }

  const formatted = `${prefix}${displayName}`;
  return formatted.padEnd(SPEC_COLUMN_WIDTH);
}

function renderSpecRow(
  spec: SpecInfo,
  startDate: dayjs.Dayjs,
  weeks: number,
  today: dayjs.Dayjs,
  timelineColumnWidth: number
): void {
  const specName = formatSpecName(spec);
  const timelineBar = renderTimelineBar(spec, startDate, weeks, today, timelineColumnWidth);

  // Render with 2 spaces indentation for specs under priority groups
  console.log(`  ${specName}${COLUMN_SEPARATOR}${timelineBar}`);
}

function renderTimelineBar(
  spec: SpecInfo,
  startDate: dayjs.Dayjs,
  weeks: number,
  today: dayjs.Dayjs,
  timelineColumnWidth: number
): string {
  const charsPerWeek = 8;

  // If spec has no due date, show placeholder text
  if (!spec.frontmatter.due) {
    return chalk.dim('(no due date set)');
  }

  const due = dayjs(spec.frontmatter.due);

  // Calculate bar position - bars now start from today, not creation date
  const specStart = today;
  const specEnd = due;

  const startDaysFromStart = specStart.diff(startDate, 'day');
  const endDaysFromStart = specEnd.diff(startDate, 'day');

  const startPos = Math.floor((startDaysFromStart / 7) * charsPerWeek);
  const endPos = Math.floor((endDaysFromStart / 7) * charsPerWeek);

  const barStart = Math.max(0, startPos);
  const barEnd = Math.min(timelineColumnWidth, endPos);
  const barLength = Math.max(1, barEnd - barStart);

  // Build bar string
  let result = '';

  // Leading space
  if (barStart > 0) {
    result += ' '.repeat(barStart);
  }

  // Bar content based on status
  if (spec.frontmatter.status === 'complete') {
    result += chalk.green('█'.repeat(barLength));
  } else if (spec.frontmatter.status === 'in-progress') {
    // Half-filled for in-progress
    const halfLength = Math.floor(barLength / 2);
    result += chalk.yellow('█'.repeat(halfLength));
    result += chalk.dim('░'.repeat(barLength - halfLength));
  } else {
    // Light shade for planned
    result += chalk.dim('░'.repeat(barLength));
  }

  // Trailing space to ensure consistent width
  const trailingSpace = timelineColumnWidth - (barStart + barLength);
  if (trailingSpace > 0) {
    result += ' '.repeat(trailingSpace);
  }

  return result;
}
