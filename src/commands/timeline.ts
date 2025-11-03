import chalk from 'chalk';
import dayjs from 'dayjs';
import { loadAllSpecs } from '../spec-loader.js';
import type { SpecFilterOptions } from '../frontmatter.js';
import { autoCheckIfEnabled } from './check.js';

export async function timelineCommand(options: {
  days?: number;
  byTag?: boolean;
  byAssignee?: boolean;
}): Promise<void> {
  // Auto-check for conflicts before display
  await autoCheckIfEnabled();
  
  const days = options.days || 30;
  
  // Load all specs (including archived for completion history)
  const specs = await loadAllSpecs({
    includeArchived: true,
  });

  if (specs.length === 0) {
    console.log('No specs found.');
    return;
  }

  // Calculate date range
  const today = dayjs();
  const startDate = today.subtract(days, 'day');

  // Count specs by date
  const createdByDate: Record<string, number> = {};
  const completedByDate: Record<string, number> = {};
  const createdByMonth: Record<string, number> = {};

  for (const spec of specs) {
    const created = dayjs(spec.frontmatter.created);
    
    // Count created specs within date range
    if (created.isAfter(startDate)) {
      const dateKey = created.format('YYYY-MM-DD');
      createdByDate[dateKey] = (createdByDate[dateKey] || 0) + 1;
    }

    // Count by month for all time
    const monthKey = created.format('MMM YYYY');
    createdByMonth[monthKey] = (createdByMonth[monthKey] || 0) + 1;

    // Count completed specs
    if (spec.frontmatter.completed) {
      const completed = dayjs(spec.frontmatter.completed);
      if (completed.isAfter(startDate)) {
        const dateKey = completed.format('YYYY-MM-DD');
        completedByDate[dateKey] = (completedByDate[dateKey] || 0) + 1;
      }
    }
  }

  // Display timeline
  console.log(chalk.bold.cyan('📈 Spec Timeline'));
  console.log('');

  // Show daily activity (only days with activity)
  const allDates = new Set([...Object.keys(createdByDate), ...Object.keys(completedByDate)]);
  const sortedDates = Array.from(allDates).sort();

  if (sortedDates.length > 0) {
    console.log(chalk.bold(`Activity (Last ${days} Days):`));
    console.log('');
    
    // Column headers
    const dateWidth = 12;
    const barWidth = 15;
    const numWidth = 3;
    const colWidth = barWidth + numWidth;
    
    console.log(`  ${'Date'.padEnd(dateWidth)}  ${chalk.cyan('Created'.padEnd(colWidth))}  ${chalk.green('Completed'.padEnd(colWidth))}`);
    console.log(`  ${chalk.dim('─'.repeat(dateWidth))}  ${chalk.dim('─'.repeat(colWidth))}  ${chalk.dim('─'.repeat(colWidth))}`);
    
    for (const date of sortedDates) {
      const created = createdByDate[date] || 0;
      const completed = completedByDate[date] || 0;
      
      const maxCount = Math.max(...Object.values(createdByDate), ...Object.values(completedByDate));
      const createdBarWidth = Math.round((created / maxCount) * barWidth);
      const completedBarWidth = Math.round((completed / maxCount) * barWidth);
      
      const createdBar = '━'.repeat(createdBarWidth);
      const completedBar = '━'.repeat(completedBarWidth);
      
      const createdCol = `${createdBar.padEnd(barWidth)}${created.toString().padStart(numWidth)}`;
      const completedCol = `${completedBar.padEnd(barWidth)}${completed.toString().padStart(numWidth)}`;
      
      console.log(`  ${chalk.dim(date.padEnd(dateWidth))}  ${chalk.cyan(createdCol)}  ${chalk.green(completedCol)}`);
    }
    console.log('');
  }

  // Show creation by month (all time)
  const sortedMonths = Object.entries(createdByMonth)
    .sort((a, b) => {
      const dateA = dayjs(a[0], 'MMM YYYY');
      const dateB = dayjs(b[0], 'MMM YYYY');
      return dateB.diff(dateA);
    })
    .slice(0, 6); // Last 6 months

  if (sortedMonths.length > 0) {
    console.log(chalk.bold('Monthly Overview:'));
    console.log('');
    
    const monthWidth = 12;
    const barWidth = 20;
    const numWidth = 3;
    
    console.log(`  ${'Month'.padEnd(monthWidth)}  ${chalk.magenta('Specs'.padEnd(barWidth + numWidth))}`);
    console.log(`  ${chalk.dim('─'.repeat(monthWidth))}  ${chalk.dim('─'.repeat(barWidth + numWidth))}`);
    
    const maxMonthCount = Math.max(...sortedMonths.map(([, count]) => count));
    for (const [month, count] of sortedMonths) {
      const barLen = Math.round((count / maxMonthCount) * barWidth);
      const bar = '━'.repeat(barLen);
      console.log(`  ${month.padEnd(monthWidth)}  ${chalk.magenta(bar.padEnd(barWidth))}${chalk.magenta(count.toString().padStart(numWidth))}`);
    }
    console.log('');
  }

  // Completion rate
  const last7Days = specs.filter(s => {
    if (!s.frontmatter.completed) return false;
    const completed = dayjs(s.frontmatter.completed);
    return completed.isAfter(today.subtract(7, 'day'));
  }).length;

  const last30Days = specs.filter(s => {
    if (!s.frontmatter.completed) return false;
    const completed = dayjs(s.frontmatter.completed);
    return completed.isAfter(today.subtract(30, 'day'));
  }).length;

  console.log(chalk.bold('Completion Rate:'));
  console.log('');
  
  const labelWidth = 13;
  const countWidth = 3;
  
  console.log(`  ${'Period'.padEnd(labelWidth)}  ${'Count'.padEnd(countWidth)}`);
  console.log(`  ${chalk.dim('─'.repeat(labelWidth))}  ${chalk.dim('─'.repeat(countWidth))}`);
  console.log(`  ${'Last 7 days'.padEnd(labelWidth)}  ${chalk.green(last7Days.toString().padStart(countWidth))}`);
  console.log(`  ${'Last 30 days'.padEnd(labelWidth)}  ${chalk.green(last30Days.toString().padStart(countWidth))}`);
  console.log('');

  // By tag breakdown (if requested)
  if (options.byTag) {
    const tagStats: Record<string, { created: number; completed: number }> = {};
    
    for (const spec of specs) {
      const created = dayjs(spec.frontmatter.created);
      const isInRange = created.isAfter(startDate);
      
      if (isInRange && spec.frontmatter.tags) {
        for (const tag of spec.frontmatter.tags) {
          if (!tagStats[tag]) tagStats[tag] = { created: 0, completed: 0 };
          tagStats[tag].created++;
          
          if (spec.frontmatter.completed) {
            const completed = dayjs(spec.frontmatter.completed);
            if (completed.isAfter(startDate)) {
              tagStats[tag].completed++;
            }
          }
        }
      }
    }
    
    const sortedTags = Object.entries(tagStats)
      .sort((a, b) => b[1].created - a[1].created)
      .slice(0, 10);
    
    if (sortedTags.length > 0) {
      console.log(chalk.bold('By Tag:'));
      for (const [tag, stats] of sortedTags) {
        console.log(`  ${chalk.dim('#')}${tag.padEnd(20)} ${chalk.cyan(stats.created)} created · ${chalk.green(stats.completed)} completed`);
      }
      console.log('');
    }
  }

  // By assignee breakdown (if requested)
  if (options.byAssignee) {
    const assigneeStats: Record<string, { created: number; completed: number }> = {};
    
    for (const spec of specs) {
      if (!spec.frontmatter.assignee) continue;
      
      const created = dayjs(spec.frontmatter.created);
      const isInRange = created.isAfter(startDate);
      
      if (isInRange) {
        const assignee = spec.frontmatter.assignee;
        if (!assigneeStats[assignee]) assigneeStats[assignee] = { created: 0, completed: 0 };
        assigneeStats[assignee].created++;
        
        if (spec.frontmatter.completed) {
          const completed = dayjs(spec.frontmatter.completed);
          if (completed.isAfter(startDate)) {
            assigneeStats[assignee].completed++;
          }
        }
      }
    }
    
    const sortedAssignees = Object.entries(assigneeStats)
      .sort((a, b) => b[1].created - a[1].created);
    
    if (sortedAssignees.length > 0) {
      console.log(chalk.bold('By Assignee:'));
      for (const [assignee, stats] of sortedAssignees) {
        console.log(`  ${chalk.dim('@')}${assignee.padEnd(20)} ${chalk.cyan(stats.created)} created · ${chalk.green(stats.completed)} completed`);
      }
      console.log('');
    }
  }
}
