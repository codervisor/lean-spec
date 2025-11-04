import chalk from 'chalk';
import dayjs from 'dayjs';
import { loadAllSpecs } from '../spec-loader.js';
import type { SpecStatus, SpecPriority, SpecFilterOptions } from '../frontmatter.js';
import { withSpinner } from '../utils/ui.js';
import { autoCheckIfEnabled } from './check.js';
import { calculateVelocityMetrics } from '../utils/velocity.js';
import { countSpecsByStatusAndPriority } from '../utils/spec-stats.js';
import { calculateHealth, getHealthStatus } from '../utils/health.js';
import { generateInsights, getSpecInsightDetails } from '../utils/insights.js';

export async function statsCommand(options: {
  tag?: string;
  assignee?: string;
  full?: boolean;
  timeline?: boolean;
  velocity?: boolean;
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

  // Determine what sections to show
  // --full shows everything (like old analytics)
  // --timeline or --velocity shows specific section
  // Default (no flags): show simplified view with insights
  const showFull = options.full || false;
  const showStats = options.full || (!options.timeline && !options.velocity);
  const showTimeline = options.timeline || options.full;
  const showVelocity = options.velocity || options.full;
  const showSimplified = !options.full && !options.timeline && !options.velocity;

  // Calculate all metrics upfront
  const { statusCounts, priorityCounts, tagCounts } = countSpecsByStatusAndPriority(specs);
  const velocityMetrics = calculateVelocityMetrics(specs);
  const healthMetrics = calculateHealth(specs);
  const insights = generateInsights(specs);

  // JSON output
  if (options.json) {
    const data = {
      total: specs.length,
      status: statusCounts,
      priority: priorityCounts,
      tags: tagCounts,
      health: healthMetrics,
      velocity: velocityMetrics,
      insights: insights,
      filter,
    };
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // Display statistics
  console.log(chalk.bold.cyan('📊 Spec Stats'));
  console.log('');

  // Filter info
  if (options.tag || options.assignee) {
    const filterParts: string[] = [];
    if (options.tag) filterParts.push(`tag=${options.tag}`);
    if (options.assignee) filterParts.push(`assignee=${options.assignee}`);
    console.log(chalk.dim(`Filtered by: ${filterParts.join(', ')}`));
    console.log('');
  }

  // ============================================================
  // SIMPLIFIED VIEW (Default)
  // ============================================================
  if (showSimplified) {
    // Overview with health score
    console.log(chalk.bold('📈 Overview'));
    console.log('');
    
    const healthStatus = getHealthStatus(healthMetrics.score);
    const healthColor = healthStatus.color === 'green' ? chalk.green : 
                       healthStatus.color === 'yellow' ? chalk.yellow : 
                       chalk.red;
    
    console.log(`  Total Specs           ${chalk.cyan(healthMetrics.totalSpecs)}`);
    console.log(`  Active (Planned+WIP)  ${chalk.yellow(healthMetrics.activeSpecs)}`);
    console.log(`  Complete              ${chalk.green(healthMetrics.completeSpecs)}`);
    console.log(`  Health Score          ${healthColor(`${healthMetrics.score}% ${healthStatus.emoji}`)}`);
    console.log('');

    // Status (simplified)
    console.log(chalk.bold('📊 Status'));
    console.log('');
    
    const labelWidth = 15;
    const barWidth = 20;
    const maxStatusCount = Math.max(...Object.values(statusCounts));
    const createBar = (count: number, maxCount: number, char: string = '█') => {
      const width = Math.round((count / maxCount) * barWidth);
      const filledWidth = Math.min(width, barWidth);
      const emptyWidth = barWidth - filledWidth;
      return char.repeat(filledWidth) + chalk.dim('░').repeat(emptyWidth);
    };
    
    console.log(`  📅 ${'Planned'.padEnd(labelWidth)}  ${chalk.cyan(createBar(statusCounts.planned, maxStatusCount))}  ${chalk.cyan(statusCounts.planned)}`);
    console.log(`  ⏳ ${'In Progress'.padEnd(labelWidth)}  ${chalk.yellow(createBar(statusCounts['in-progress'], maxStatusCount))}  ${chalk.yellow(statusCounts['in-progress'])}`);
    console.log(`  ✅ ${'Complete'.padEnd(labelWidth)}  ${chalk.green(createBar(statusCounts.complete, maxStatusCount))}  ${chalk.green(statusCounts.complete)}`);
    console.log('');

    // Priority Focus (only critical/high with issues)
    const criticalCount = priorityCounts.critical || 0;
    const highCount = priorityCounts.high || 0;
    const criticalInProgress = specs.filter(s => s.frontmatter.priority === 'critical' && s.frontmatter.status === 'in-progress').length;
    const highInProgress = specs.filter(s => s.frontmatter.priority === 'high' && s.frontmatter.status === 'in-progress').length;
    
    if (criticalCount > 0 || highCount > 0) {
      console.log(chalk.bold('🎯 Priority Focus'));
      console.log('');
      
      if (criticalCount > 0) {
        const overdueCount = specs.filter(s => 
          s.frontmatter.priority === 'critical' && 
          s.frontmatter.due && 
          dayjs(s.frontmatter.due).isBefore(dayjs(), 'day') &&
          s.frontmatter.status !== 'complete'
        ).length;
        
        const statusText = overdueCount > 0 ? chalk.red(`${overdueCount} overdue!`) : 
                          criticalInProgress > 0 ? `${criticalInProgress} in-progress` : '';
        
        console.log(`  🔴 Critical      ${chalk.red(criticalCount)} specs${statusText ? ` (${statusText})` : ''}`);
      }
      
      if (highCount > 0) {
        const overdueCount = specs.filter(s => 
          s.frontmatter.priority === 'high' && 
          s.frontmatter.due && 
          dayjs(s.frontmatter.due).isBefore(dayjs(), 'day') &&
          s.frontmatter.status !== 'complete'
        ).length;
        
        const statusText = overdueCount > 0 ? chalk.yellow(`${overdueCount} overdue`) : 
                          highInProgress > 0 ? `${highInProgress} in-progress` : '';
        
        console.log(`  🟠 High          ${chalk.hex('#FFA500')(highCount)} specs${statusText ? ` (${statusText})` : ''}`);
      }
      
      console.log('');
    }

    // Needs Attention (insights)
    if (insights.length > 0) {
      console.log(chalk.bold.yellow('⚠️  Needs Attention'));
      console.log('');
      
      for (const insight of insights) {
        const color = insight.severity === 'critical' ? chalk.red :
                     insight.severity === 'warning' ? chalk.yellow :
                     chalk.cyan;
        
        console.log(`  ${color('•')} ${insight.message}`);
        
        // Show up to 3 spec examples
        for (const specPath of insight.specs.slice(0, 3)) {
          const spec = specs.find(s => s.path === specPath);
          const details = spec ? getSpecInsightDetails(spec) : null;
          console.log(`    ${chalk.dim(specPath)}${details ? chalk.dim(` (${details})`) : ''}`);
        }
        
        if (insight.specs.length > 3) {
          console.log(`    ${chalk.dim(`...and ${insight.specs.length - 3} more`)}`);
        }
      }
      
      console.log('');
    } else if (healthMetrics.activeSpecs === 0 && healthMetrics.completeSpecs > 0) {
      // Celebrate completion!
      console.log(chalk.bold.green('🎉 All Specs Complete!'));
      console.log('');
      console.log(`  ${chalk.dim('Great work! All active specs are complete.')}`);
      console.log('');
    } else if (healthMetrics.activeSpecs > 0) {
      // Positive message
      console.log(chalk.bold.green('✨ All Clear!'));
      console.log('');
      console.log(`  ${chalk.dim('No critical issues detected. Keep up the good work!')}`);
      console.log('');
    }

    // Velocity Summary
    console.log(chalk.bold('🚀 Velocity Summary'));
    console.log('');
    
    const cycleTimeStatus = velocityMetrics.cycleTime.average <= 7 ? chalk.green('✓') : chalk.yellow('⚠');
    const throughputTrend = velocityMetrics.throughput.trend === 'up' ? chalk.green('↑') : 
                           velocityMetrics.throughput.trend === 'down' ? chalk.red('↓') : 
                           chalk.yellow('→');
    
    console.log(`  Avg Cycle Time   ${chalk.cyan(velocityMetrics.cycleTime.average.toFixed(1))} days ${cycleTimeStatus}${velocityMetrics.cycleTime.average <= 7 ? chalk.dim(' (target: 7d)') : ''}`);
    console.log(`  Throughput       ${chalk.cyan((velocityMetrics.throughput.perWeek / 7 * 7).toFixed(1))}/week ${throughputTrend}`);
    console.log(`  WIP              ${chalk.yellow(velocityMetrics.wip.current)} specs`);
    console.log('');

    // Prompt for full view
    console.log(chalk.dim('💡 Use `lspec stats --full` for detailed analytics'));
    console.log(chalk.dim('   Use `lspec stats --velocity` for velocity breakdown'));
    console.log(chalk.dim('   Use `lspec stats --timeline` for activity timeline'));
    console.log('');
    
    return;
  }

  // ============================================================
  // FULL VIEW (--full or specific flags)
  // ============================================================
  // Common layout constants
  const labelWidth = 20;
  const barWidth = 20;
  const valueWidth = 5;

  // Helper to create bars
  const createBar = (count: number, maxCount: number, char: string = '━') => {
    const width = Math.round((count / maxCount) * barWidth);
    return char.repeat(width);
  };

  // ============================================================
  // STATS SECTION
  // ============================================================
  if (showStats) {
    // Overview
    const totalWithPriority = Object.values(priorityCounts).reduce(
      (sum, count) => sum + count,
      0
    );
    console.log(chalk.bold('📈 Overview'));
    console.log('');

    console.log(
      `  ${'Metric'.padEnd(labelWidth)}  ${'Value'.padStart(valueWidth)}`
    );
    console.log(
      `  ${chalk.dim('─'.repeat(labelWidth))}  ${chalk.dim('─'.repeat(valueWidth))}`
    );
    console.log(
      `  ${'Total Specs'.padEnd(labelWidth)}  ${chalk.green(specs.length.toString().padStart(valueWidth))}`
    );
    console.log(
      `  ${'With Priority'.padEnd(labelWidth)}  ${chalk.cyan(totalWithPriority.toString().padStart(valueWidth))}`
    );
    console.log(
      `  ${'Unique Tags'.padEnd(labelWidth)}  ${chalk.magenta(Object.keys(tagCounts).length.toString().padStart(valueWidth))}`
    );
    console.log('');

    // Status Distribution
    console.log(chalk.bold('📊 Status Distribution'));
    console.log('');

    const maxStatusCount = Math.max(...Object.values(statusCounts));
    const colWidth = barWidth + 3;

    console.log(
      `  ${'Status'.padEnd(labelWidth)}  ${chalk.cyan('Count'.padEnd(colWidth))}`
    );
    console.log(
      `  ${chalk.dim('─'.repeat(labelWidth))}  ${chalk.dim('─'.repeat(colWidth))}`
    );
    console.log(
      `  📋 ${'Planned'.padEnd(labelWidth - 3)}  ${chalk.cyan(createBar(statusCounts.planned, maxStatusCount).padEnd(barWidth))}${chalk.cyan(statusCounts.planned.toString().padStart(3))}`
    );
    console.log(
      `  ⏳ ${'In Progress'.padEnd(labelWidth - 3)}  ${chalk.yellow(createBar(statusCounts['in-progress'], maxStatusCount).padEnd(barWidth))}${chalk.yellow(statusCounts['in-progress'].toString().padStart(3))}`
    );
    console.log(
      `  ✅ ${'Complete'.padEnd(labelWidth - 3)}  ${chalk.green(createBar(statusCounts.complete, maxStatusCount).padEnd(barWidth))}${chalk.green(statusCounts.complete.toString().padStart(3))}`
    );
    console.log(
      `  📦 ${'Archived'.padEnd(labelWidth - 3)}  ${chalk.dim(createBar(statusCounts.archived, maxStatusCount).padEnd(barWidth))}${chalk.dim(statusCounts.archived.toString().padStart(3))}`
    );
    console.log('');

    // Priority Breakdown
    if (totalWithPriority > 0) {
      console.log(chalk.bold('🎯 Priority Breakdown'));
      console.log('');

      const maxPriorityCount = Math.max(
        ...Object.values(priorityCounts).filter((c) => c > 0)
      );

      console.log(
        `  ${'Priority'.padEnd(labelWidth)}  ${chalk.cyan('Count'.padEnd(colWidth))}`
      );
      console.log(
        `  ${chalk.dim('─'.repeat(labelWidth))}  ${chalk.dim('─'.repeat(colWidth))}`
      );

      if (priorityCounts.critical > 0) {
        console.log(
          `  🔴 ${'Critical'.padEnd(labelWidth - 3)}  ${chalk.red(createBar(priorityCounts.critical, maxPriorityCount).padEnd(barWidth))}${chalk.red(priorityCounts.critical.toString().padStart(3))}`
        );
      }
      if (priorityCounts.high > 0) {
        console.log(
          `  🟠 ${'High'.padEnd(labelWidth - 3)}  ${chalk.hex('#FFA500')(createBar(priorityCounts.high, maxPriorityCount).padEnd(barWidth))}${chalk.hex('#FFA500')(priorityCounts.high.toString().padStart(3))}`
        );
      }
      if (priorityCounts.medium > 0) {
        console.log(
          `  🟡 ${'Medium'.padEnd(labelWidth - 3)}  ${chalk.yellow(createBar(priorityCounts.medium, maxPriorityCount).padEnd(barWidth))}${chalk.yellow(priorityCounts.medium.toString().padStart(3))}`
        );
      }
      if (priorityCounts.low > 0) {
        console.log(
          `  🟢 ${'Low'.padEnd(labelWidth - 3)}  ${chalk.green(createBar(priorityCounts.low, maxPriorityCount).padEnd(barWidth))}${chalk.green(priorityCounts.low.toString().padStart(3))}`
        );
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

      console.log(
        `  ${'Tag'.padEnd(labelWidth)}  ${chalk.magenta('Count'.padEnd(colWidth))}`
      );
      console.log(
        `  ${chalk.dim('─'.repeat(labelWidth))}  ${chalk.dim('─'.repeat(colWidth))}`
      );

      for (const [tag, count] of topTags) {
        const truncatedTag =
          tag.length > labelWidth ? tag.substring(0, labelWidth - 1) + '…' : tag;
        const bar = createBar(count, maxTagCount);
        console.log(
          `  ${truncatedTag.padEnd(labelWidth)}  ${chalk.magenta(bar.padEnd(barWidth))}${chalk.magenta(count.toString().padStart(3))}`
        );
      }
      console.log('');
    }
  }

  // ============================================================
  // TIMELINE SECTION
  // ============================================================
  if (showTimeline) {
    const days = 30;
    const today = dayjs();
    const startDate = today.subtract(days, 'day');

    // Count specs by date
    const createdByDate: Record<string, number> = {};
    const completedByDate: Record<string, number> = {};

    for (const spec of specs) {
      const created = dayjs(spec.frontmatter.created);

      // Count created specs within date range
      if (created.isAfter(startDate)) {
        const dateKey = created.format('YYYY-MM-DD');
        createdByDate[dateKey] = (createdByDate[dateKey] || 0) + 1;
      }

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
    const allDates = new Set([
      ...Object.keys(createdByDate),
      ...Object.keys(completedByDate),
    ]);
    const sortedDates = Array.from(allDates).sort();

    if (sortedDates.length > 0) {
      console.log(chalk.bold(`📅 Activity (Last ${days} Days)`));
      console.log('');

      const colWidth = barWidth + 3;

      console.log(
        `  ${'Date'.padEnd(15)}  ${chalk.cyan('Created'.padEnd(colWidth))}  ${chalk.green('Completed'.padEnd(colWidth))}`
      );
      console.log(
        `  ${chalk.dim('─'.repeat(15))}  ${chalk.dim('─'.repeat(colWidth))}  ${chalk.dim('─'.repeat(colWidth))}`
      );

      const maxCount = Math.max(
        ...Object.values(createdByDate),
        ...Object.values(completedByDate)
      );

      // Show only last 10 days with activity
      for (const date of sortedDates.slice(-10)) {
        const created = createdByDate[date] || 0;
        const completed = completedByDate[date] || 0;

        const createdBar = createBar(created, maxCount, '━');
        const completedBar = createBar(completed, maxCount, '━');

        const createdCol = `${createdBar.padEnd(barWidth)}${created.toString().padStart(3)}`;
        const completedCol = `${completedBar.padEnd(barWidth)}${completed.toString().padStart(3)}`;

        console.log(
          `  ${chalk.dim(date.padEnd(15))}  ${chalk.cyan(createdCol)}  ${chalk.green(completedCol)}`
        );
      }
      console.log('');
    }
  }

  // ============================================================
  // VELOCITY SECTION
  // ============================================================
  if (showVelocity) {
    console.log(chalk.bold('🚀 Velocity Metrics'));
    console.log('');

    // Cycle Time
    console.log(chalk.bold('⏱️  Cycle Time (Created → Completed)'));
    console.log('');
    console.log(
      `  ${'Metric'.padEnd(labelWidth)}  ${'Days'.padStart(valueWidth)}`
    );
    console.log(
      `  ${chalk.dim('─'.repeat(labelWidth))}  ${chalk.dim('─'.repeat(valueWidth))}`
    );
    console.log(
      `  ${'Average'.padEnd(labelWidth)}  ${chalk.cyan(velocityMetrics.cycleTime.average.toFixed(1).padStart(valueWidth))}`
    );
    console.log(
      `  ${'Median'.padEnd(labelWidth)}  ${chalk.cyan(velocityMetrics.cycleTime.median.toFixed(1).padStart(valueWidth))}`
    );
    console.log(
      `  ${'90th Percentile'.padEnd(labelWidth)}  ${chalk.yellow(velocityMetrics.cycleTime.p90.toFixed(1).padStart(valueWidth))}`
    );
    console.log('');

    // Throughput
    console.log(chalk.bold('📦 Throughput'));
    console.log('');
    console.log(
      `  ${'Period'.padEnd(labelWidth)}  ${'Specs'.padStart(valueWidth)}`
    );
    console.log(
      `  ${chalk.dim('─'.repeat(labelWidth))}  ${chalk.dim('─'.repeat(valueWidth))}`
    );
    console.log(
      `  ${'Last 7 days'.padEnd(labelWidth)}  ${chalk.green(velocityMetrics.throughput.perWeek.toString().padStart(valueWidth))}`
    );
    console.log(
      `  ${'Last 30 days'.padEnd(labelWidth)}  ${chalk.green(velocityMetrics.throughput.perMonth.toString().padStart(valueWidth))}`
    );

    const trendColor =
      velocityMetrics.throughput.trend === 'up'
        ? chalk.green
        : velocityMetrics.throughput.trend === 'down'
          ? chalk.red
          : chalk.yellow;
    const trendSymbol =
      velocityMetrics.throughput.trend === 'up'
        ? '↑'
        : velocityMetrics.throughput.trend === 'down'
          ? '↓'
          : '→';
    console.log(
      `  ${'Trend'.padEnd(labelWidth)}  ${trendColor(trendSymbol + ' ' + velocityMetrics.throughput.trend.padStart(valueWidth - 2))}`
    );
    console.log('');

    // WIP
    console.log(chalk.bold('🔄 Work In Progress'));
    console.log('');
    console.log(
      `  ${'Metric'.padEnd(labelWidth)}  ${'Specs'.padStart(valueWidth)}`
    );
    console.log(
      `  ${chalk.dim('─'.repeat(labelWidth))}  ${chalk.dim('─'.repeat(valueWidth))}`
    );
    console.log(
      `  ${'Current'.padEnd(labelWidth)}  ${chalk.yellow(velocityMetrics.wip.current.toString().padStart(valueWidth))}`
    );
    console.log(
      `  ${'30-day Average'.padEnd(labelWidth)}  ${chalk.cyan(velocityMetrics.wip.average.toFixed(1).padStart(valueWidth))}`
    );
    console.log('');

    // Lead Time (if available)
    if (
      velocityMetrics.leadTime.plannedToInProgress > 0 ||
      velocityMetrics.leadTime.inProgressToComplete > 0
    ) {
      console.log(chalk.bold('🔀 Lead Time by Stage'));
      console.log('');
      console.log(
        `  ${'Stage'.padEnd(labelWidth)}  ${'Days'.padStart(valueWidth)}`
      );
      console.log(
        `  ${chalk.dim('─'.repeat(labelWidth))}  ${chalk.dim('─'.repeat(valueWidth))}`
      );
      if (velocityMetrics.leadTime.plannedToInProgress > 0) {
        console.log(
          `  ${'Planned → In Progress'.padEnd(labelWidth)}  ${chalk.cyan(velocityMetrics.leadTime.plannedToInProgress.toFixed(1).padStart(valueWidth))}`
        );
      }
      if (velocityMetrics.leadTime.inProgressToComplete > 0) {
        console.log(
          `  ${'In Progress → Complete'.padEnd(labelWidth)}  ${chalk.green(velocityMetrics.leadTime.inProgressToComplete.toFixed(1).padStart(valueWidth))}`
        );
      }
      console.log('');
    }
  }
}
