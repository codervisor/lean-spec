import chalk from 'chalk';
import dayjs from 'dayjs';
import { loadAllSpecs, type SpecInfo } from '../spec-loader.js';

export async function ganttCommand(options: {
  weeks?: number;
  showComplete?: boolean;
  criticalPath?: boolean;
}): Promise<void> {
  const weeks = options.weeks || 4;
  
  // Load all specs
  const specs = await loadAllSpecs({
    includeArchived: false,
  });

  if (specs.length === 0) {
    console.log('No specs found.');
    return;
  }

  // Filter specs with due dates or in relevant status
  const relevantSpecs = specs.filter(spec => {
    if (!options.showComplete && spec.frontmatter.status === 'complete') {
      return false;
    }
    // Include specs that have due dates, dependencies, or are in progress
    return (
      spec.frontmatter.due ||
      spec.frontmatter.depends_on ||
      spec.frontmatter.status === 'in-progress' ||
      spec.frontmatter.status === 'complete'
    );
  });

  if (relevantSpecs.length === 0) {
    console.log('No specs found with due dates or dependencies.');
    console.log(chalk.gray('Tip: Add a "due: YYYY-MM-DD" field to frontmatter to use gantt view.'));
    return;
  }

  // Calculate date range
  const today = dayjs();
  const startDate = today.startOf('week');
  const endDate = startDate.add(weeks, 'week');

  // Display gantt chart
  console.log('');
  console.log(chalk.green('📅 Gantt Chart'));
  console.log('');

  // Display timeline header
  const timelineHeader = buildTimelineHeader(startDate, weeks);
  console.log(timelineHeader);
  console.log('|' + '--------|'.repeat(weeks));
  console.log('');

  // Display each spec
  for (const spec of relevantSpecs) {
    displaySpecTimeline(spec, startDate, endDate, weeks, specs);
    console.log('');
  }
}

function buildTimelineHeader(startDate: dayjs.Dayjs, weeks: number): string {
  const dates: string[] = [];
  for (let i = 0; i < weeks; i++) {
    const date = startDate.add(i, 'week');
    dates.push(date.format('MMM D').padEnd(8));
  }
  return dates.join(' ');
}

function displaySpecTimeline(
  spec: SpecInfo,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  weeks: number,
  allSpecs: SpecInfo[]
): void {
  // Display spec name
  console.log(chalk.cyan(spec.path));

  // Show dependencies if any
  if (spec.frontmatter.depends_on && spec.frontmatter.depends_on.length > 0) {
    console.log(chalk.gray(`  ↳ depends on: ${spec.frontmatter.depends_on.join(', ')}`));
  }

  // Build timeline bar
  const bar = buildTimelineBar(spec, startDate, endDate, weeks);
  console.log(bar);

  // Show metadata
  const meta: string[] = [];
  meta.push(getStatusLabel(spec.frontmatter.status));
  if (spec.frontmatter.due) {
    meta.push(`due: ${spec.frontmatter.due}`);
  }
  console.log(chalk.gray(`  (${meta.join(', ')})`));
}

function buildTimelineBar(
  spec: SpecInfo,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  weeks: number
): string {
  const charsPerWeek = 8;
  const totalChars = weeks * charsPerWeek;
  
  // Determine spec dates
  const created = dayjs(spec.frontmatter.created);
  const due = spec.frontmatter.due ? dayjs(spec.frontmatter.due) : null;
  const completed = spec.frontmatter.completed ? dayjs(spec.frontmatter.completed) : null;
  
  // If no due date and not started before timeline, estimate based on status
  let specStart = created;
  let specEnd = due || completed;
  
  // Default duration if no due date (2 weeks from creation)
  if (!specEnd && spec.frontmatter.status !== 'complete') {
    specEnd = created.add(2, 'week');
  }
  
  if (!specEnd) {
    // No timeline info, just show a marker at creation
    const daysFromStart = created.diff(startDate, 'day');
    const position = Math.floor((daysFromStart / 7) * charsPerWeek);
    
    if (position >= 0 && position < totalChars) {
      const bar = ' '.repeat(position) + '■' + ' '.repeat(totalChars - position - 1);
      return bar;
    }
    return ' '.repeat(totalChars);
  }
  
  // Calculate bar position and length
  const startDaysFromStart = specStart.diff(startDate, 'day');
  const endDaysFromStart = specEnd.diff(startDate, 'day');
  
  const startPos = Math.floor((startDaysFromStart / 7) * charsPerWeek);
  const endPos = Math.floor((endDaysFromStart / 7) * charsPerWeek);
  
  const barStart = Math.max(0, startPos);
  const barEnd = Math.min(totalChars, endPos);
  const barLength = Math.max(1, barEnd - barStart);
  
  // Build bar based on status
  let fillChar = '■';
  let emptyChar = '□';
  let color = chalk.blue;
  
  if (spec.frontmatter.status === 'complete') {
    fillChar = '■';
    color = chalk.green;
  } else if (spec.frontmatter.status === 'in-progress') {
    fillChar = '■';
    emptyChar = '□';
    color = chalk.yellow;
    
    // Show progress (half filled for in-progress)
    const halfLength = Math.floor(barLength / 2);
    const filled = fillChar.repeat(halfLength);
    const empty = emptyChar.repeat(barLength - halfLength);
    const bar = ' '.repeat(barStart) + color(filled + empty) + ' '.repeat(Math.max(0, totalChars - barEnd));
    return bar;
  } else {
    fillChar = '□';
    color = chalk.gray;
  }
  
  const bar = ' '.repeat(barStart) + color(fillChar.repeat(barLength)) + ' '.repeat(Math.max(0, totalChars - barEnd));
  return bar;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'planned': return 'planned';
    case 'in-progress': return 'in-progress';
    case 'complete': return 'complete';
    case 'archived': return 'archived';
    default: return status;
  }
}
