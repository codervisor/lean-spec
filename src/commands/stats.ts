import chalk from 'chalk';
import { loadAllSpecs } from '../spec-loader.js';
import type { SpecStatus, SpecPriority, SpecFilterOptions } from '../frontmatter.js';
import { withSpinner } from '../utils/ui.js';
import { autoCheckIfEnabled } from './check.js';

export async function statsCommand(options: {
  tag?: string;
  assignee?: string;
  json?: boolean;
}): Promise<void> {
  // Auto-check for conflicts before stats
  await autoCheckIfEnabled();
  
  // Build filter
  const filter: SpecFilterOptions = {};
  if (options.tag) {
    filter.tags = [options.tag];
  }
  if (options.assignee) {
    filter.assignee = options.assignee;
  }

  // Load all specs with spinner (including archived for total count)
  const specs = await withSpinner(
    'Loading specs...',
    () => loadAllSpecs({
      includeArchived: true,
      filter,
    })
  );

  if (specs.length === 0) {
    console.log('No specs found.');
    return;
  }

  // Calculate statistics
  const statusCounts: Record<SpecStatus, number> = {
    planned: 0,
    'in-progress': 0,
    complete: 0,
    archived: 0,
  };

  const priorityCounts: Record<SpecPriority, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  const tagCounts: Record<string, number> = {};

  for (const spec of specs) {
    statusCounts[spec.frontmatter.status]++;
    if (spec.frontmatter.priority) {
      priorityCounts[spec.frontmatter.priority]++;
    }
    if (spec.frontmatter.tags) {
      for (const tag of spec.frontmatter.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
  }

  // Output as JSON if requested
  if (options.json) {
    const data = {
      total: specs.length,
      status: statusCounts,
      priority: priorityCounts,
      tags: tagCounts,
      filter: filter,
    };
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // Display statistics
  console.log(chalk.bold.cyan('📊 Spec Statistics Dashboard'));
  console.log('');

  // Filter info
  if (options.tag || options.assignee) {
    const filterParts: string[] = [];
    if (options.tag) filterParts.push(`tag=${options.tag}`);
    if (options.assignee) filterParts.push(`assignee=${options.assignee}`);
    console.log(chalk.dim(`Filtered by: ${filterParts.join(', ')}`));
    console.log('');
  }

  // Common layout constants
  const labelWidth = 15;
  const barWidth = 20;
  const specsWidth = 3;
  const colWidth = barWidth + specsWidth;

  // Helper to create bars
  const createBar = (count: number, maxCount: number, char: string = '━') => {
    const width = Math.round((count / maxCount) * barWidth);
    return char.repeat(width);
  };

  // Overview
  const totalWithPriority = Object.values(priorityCounts).reduce((sum, count) => sum + count, 0);
  console.log(chalk.bold('📈 Overview'));
  console.log('');
  
  const valueWidth = 5;
  
  console.log(`  ${'Metric'.padEnd(labelWidth)}  ${'Specs'.padStart(valueWidth)}`);
  console.log(`  ${chalk.dim('─'.repeat(labelWidth))}  ${chalk.dim('─'.repeat(valueWidth))}`);
  console.log(`  ${'Total Specs'.padEnd(labelWidth)}  ${chalk.green(specs.length.toString().padStart(valueWidth))}`);
  console.log(`  ${'With Priority'.padEnd(labelWidth)}  ${chalk.cyan(totalWithPriority.toString().padStart(valueWidth))}`);
  console.log(`  ${'Unique Tags'.padEnd(labelWidth)}  ${chalk.magenta(Object.keys(tagCounts).length.toString().padStart(valueWidth))}`);
  console.log('');

  // Status Distribution with bar charts
  console.log(chalk.bold('📊 Status Distribution'));
  console.log('');

  const maxStatusCount = Math.max(...Object.values(statusCounts));

  console.log(`  ${'Status'.padEnd(labelWidth)}  ${chalk.cyan('Specs'.padEnd(colWidth))}`);
  console.log(`  ${chalk.dim('─'.repeat(labelWidth))}  ${chalk.dim('─'.repeat(colWidth))}`);
  console.log(`  📋 ${'Planned'.padEnd(labelWidth - 3)}  ${chalk.cyan(createBar(statusCounts.planned, maxStatusCount).padEnd(barWidth))}${chalk.cyan(statusCounts.planned.toString().padStart(specsWidth))}`);
  console.log(`  ⚡ ${'In Progress'.padEnd(labelWidth - 3)}  ${chalk.yellow(createBar(statusCounts['in-progress'], maxStatusCount).padEnd(barWidth))}${chalk.yellow(statusCounts['in-progress'].toString().padStart(specsWidth))}`);
  console.log(`  ✅ ${'Complete'.padEnd(labelWidth - 3)}  ${chalk.green(createBar(statusCounts.complete, maxStatusCount).padEnd(barWidth))}${chalk.green(statusCounts.complete.toString().padStart(specsWidth))}`);
  console.log(`  📦 ${'Archived'.padEnd(labelWidth - 3)}  ${chalk.dim(createBar(statusCounts.archived, maxStatusCount).padEnd(barWidth))}${chalk.dim(statusCounts.archived.toString().padStart(specsWidth))}`);
  console.log('');

  // Priority Breakdown
  if (totalWithPriority > 0) {
    console.log(chalk.bold('🎯 Priority Breakdown'));
    console.log('');

    const maxPriorityCount = Math.max(...Object.values(priorityCounts).filter(c => c > 0));

    console.log(`  ${'Priority'.padEnd(labelWidth)}  ${chalk.cyan('Specs'.padEnd(colWidth))}`);
    console.log(`  ${chalk.dim('─'.repeat(labelWidth))}  ${chalk.dim('─'.repeat(colWidth))}`);

    if (priorityCounts.critical > 0) {
      console.log(`  🔴 ${'Critical'.padEnd(labelWidth - 3)}  ${chalk.red(createBar(priorityCounts.critical, maxPriorityCount).padEnd(barWidth))}${chalk.red(priorityCounts.critical.toString().padStart(specsWidth))}`);
    }
    if (priorityCounts.high > 0) {
      console.log(`  🟠 ${'High'.padEnd(labelWidth - 3)}  ${chalk.hex('#FFA500')(createBar(priorityCounts.high, maxPriorityCount).padEnd(barWidth))}${chalk.hex('#FFA500')(priorityCounts.high.toString().padStart(specsWidth))}`);
    }
    if (priorityCounts.medium > 0) {
      console.log(`  🟡 ${'Medium'.padEnd(labelWidth - 3)}  ${chalk.yellow(createBar(priorityCounts.medium, maxPriorityCount).padEnd(barWidth))}${chalk.yellow(priorityCounts.medium.toString().padStart(specsWidth))}`);
    }
    if (priorityCounts.low > 0) {
      console.log(`  🟢 ${'Low'.padEnd(labelWidth - 3)}  ${chalk.green(createBar(priorityCounts.low, maxPriorityCount).padEnd(barWidth))}${chalk.green(priorityCounts.low.toString().padStart(specsWidth))}`);
    }
    console.log('');
  }

  // Top Tags
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topTags.length > 0) {
    console.log(chalk.bold('🏷️  Popular Tags'));
    console.log('');

    const maxTagCount = Math.max(...topTags.map(([, count]) => count));

    console.log(`  ${'Tag'.padEnd(labelWidth)}  ${chalk.magenta('Specs'.padEnd(colWidth))}`);
    console.log(`  ${chalk.dim('─'.repeat(labelWidth))}  ${chalk.dim('─'.repeat(colWidth))}`);

    for (const [tag, count] of topTags) {
      const truncatedTag = tag.length > labelWidth ? tag.substring(0, labelWidth - 1) + '…' : tag;
      const bar = createBar(count, maxTagCount);
      console.log(`  ${truncatedTag.padEnd(labelWidth)}  ${chalk.magenta(bar.padEnd(barWidth))}${chalk.magenta(count.toString().padStart(specsWidth))}`);
    }
    console.log('');
  }
}
