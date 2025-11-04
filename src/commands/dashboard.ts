import chalk from 'chalk';
import dayjs from 'dayjs';
import { loadAllSpecs } from '../spec-loader.js';
import { withSpinner } from '../utils/ui.js';
import { autoCheckIfEnabled } from './check.js';
import { calculateVelocityMetrics } from '../utils/velocity.js';
import { countSpecsByStatusAndPriority } from '../utils/spec-stats.js';
import { getPriorityBadge } from '../utils/badge-helpers.js';

export async function dashboardCommand(options: {
  json?: boolean;
}): Promise<void> {
  // Auto-check for conflicts before display
  await autoCheckIfEnabled();

  // Load all specs
  const specs = await withSpinner('Loading specs...', () =>
    loadAllSpecs({ includeArchived: true })
  );

  if (specs.length === 0) {
    console.log('No specs found. Run `lspec create <name>` to get started.');
    return;
  }

  // Calculate metrics
  const { statusCounts, priorityCounts, tagCounts } = countSpecsByStatusAndPriority(specs);

  const inProgressSpecs: Array<{
    path: string;
    priority?: string;
    assignee?: string;
    tags?: string[];
    ageInDays: number;
  }> = [];

  for (const spec of specs) {
    // Track in-progress specs
    if (spec.frontmatter.status === 'in-progress') {
      const createdAt = spec.frontmatter.created_at || spec.frontmatter.created;
      const ageInDays = dayjs().diff(dayjs(createdAt), 'day');

      inProgressSpecs.push({
        path: spec.path,
        priority: spec.frontmatter.priority,
        assignee: spec.frontmatter.assignee,
        tags: spec.frontmatter.tags,
        ageInDays,
      });
    }
  }

  // Sort in-progress by age (oldest first)
  inProgressSpecs.sort((a, b) => b.ageInDays - a.ageInDays);

  // Calculate velocity metrics
  const velocityMetrics = calculateVelocityMetrics(specs);

  // Identify attention needed
  const overdue = specs.filter((s) => {
    if (!s.frontmatter.due) return false;
    return dayjs(s.frontmatter.due).isBefore(dayjs()) && s.frontmatter.status !== 'complete';
  });

  const criticalPlanned = specs.filter(
    (s) =>
      s.frontmatter.status === 'planned' &&
      s.frontmatter.priority === 'critical'
  );

  const longRunning = inProgressSpecs.filter((s) => s.ageInDays > 14);

  // Recent activity (last 14 days)
  const last14Days = dayjs().subtract(14, 'day');
  const recentCreated = specs.filter((s) =>
    dayjs(s.frontmatter.created_at || s.frontmatter.created).isAfter(last14Days)
  ).length;
  const recentCompleted = specs.filter((s) => {
    if (!s.frontmatter.completed_at && !s.frontmatter.completed) return false;
    const completedAt = s.frontmatter.completed_at || s.frontmatter.completed;
    return dayjs(completedAt).isAfter(last14Days);
  }).length;

  // Top tags
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  // JSON output
  if (options.json) {
    const data = {
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      summary: {
        total: specs.length,
        byStatus: statusCounts,
        byPriority: priorityCounts,
      },
      attention: {
        overdue: overdue.map((s) => s.path),
        criticalPlanned: criticalPlanned.map((s) => s.path),
        longRunning: longRunning.map((s) => s.path),
      },
      recentActivity: {
        period: '14 days',
        created: recentCreated,
        completed: recentCompleted,
      },
      velocity: velocityMetrics,
      inProgress: {
        count: inProgressSpecs.length,
        specs: inProgressSpecs,
      },
      topTags,
    };
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // Display dashboard
  console.log(chalk.bold.cyan('📊 LeanSpec Dashboard'));
  console.log('');

  // Summary
  console.log(chalk.bold('📈 Summary'));
  console.log('');
  console.log(`  Total Specs: ${chalk.cyan(specs.length)}`);
  console.log(
    `  Status: ${chalk.cyan(`${statusCounts.planned} planned`)} · ${chalk.yellow(`${statusCounts['in-progress']} in progress`)} · ${chalk.green(`${statusCounts.complete} complete`)} · ${chalk.dim(`${statusCounts.archived} archived`)}`
  );
  console.log(
    `  Priority: ${chalk.red(`${priorityCounts.critical} critical`)} · ${chalk.hex('#FFA500')(`${priorityCounts.high} high`)} · ${chalk.yellow(`${priorityCounts.medium} medium`)} · ${chalk.green(`${priorityCounts.low} low`)}`
  );
  console.log('');

  // Velocity Summary
  console.log(chalk.bold('🚀 Velocity'));
  console.log('');
  console.log(
    `  Cycle Time: ${chalk.cyan(`${velocityMetrics.cycleTime.average.toFixed(1)} days avg`)} · ${chalk.dim(`${velocityMetrics.cycleTime.median.toFixed(1)} median`)}`
  );
  console.log(
    `  Throughput: ${chalk.green(`${velocityMetrics.throughput.perWeek} last week`)} · ${chalk.green(`${velocityMetrics.throughput.perMonth} last month`)} · ${velocityMetrics.throughput.trend === 'up' ? chalk.green('↑ trending up') : velocityMetrics.throughput.trend === 'down' ? chalk.red('↓ trending down') : chalk.yellow('→ stable')}`
  );
  console.log(
    `  WIP: ${chalk.yellow(velocityMetrics.wip.current)} current · ${chalk.dim(`${velocityMetrics.wip.average.toFixed(1)} avg`)}`
  );
  console.log('');

  // Attention Needed
  const needsAttention =
    overdue.length + criticalPlanned.length + longRunning.length;
  if (needsAttention > 0) {
    console.log(chalk.bold.yellow('⚠️  Needs Attention'));
    console.log('');

    if (overdue.length > 0) {
      console.log(`  ${chalk.red(`${overdue.length} overdue specs`)}`);
      for (const spec of overdue.slice(0, 3)) {
        console.log(`    ${chalk.dim('•')} ${spec.path}`);
      }
      if (overdue.length > 3) {
        console.log(`    ${chalk.dim(`...and ${overdue.length - 3} more`)}`);
      }
    }

    if (criticalPlanned.length > 0) {
      console.log(
        `  ${chalk.red(`${criticalPlanned.length} critical specs not started`)}`
      );
      for (const spec of criticalPlanned.slice(0, 3)) {
        console.log(`    ${chalk.dim('•')} ${spec.path}`);
      }
      if (criticalPlanned.length > 3) {
        console.log(
          `    ${chalk.dim(`...and ${criticalPlanned.length - 3} more`)}`
        );
      }
    }

    if (longRunning.length > 0) {
      console.log(
        `  ${chalk.yellow(`${longRunning.length} specs running > 14 days`)}`
      );
      for (const spec of longRunning.slice(0, 3)) {
        console.log(
          `    ${chalk.dim('•')} ${spec.path} ${chalk.dim(`(${spec.ageInDays} days)`)}`
        );
      }
      if (longRunning.length > 3) {
        console.log(
          `    ${chalk.dim(`...and ${longRunning.length - 3} more`)}`
        );
      }
    }

    console.log('');
  }

  // Recent Activity
  console.log(chalk.bold('📅 Recent Activity (14 days)'));
  console.log('');
  console.log(
    `  Created: ${chalk.cyan(recentCreated)} · Completed: ${chalk.green(recentCompleted)}`
  );
  console.log('');

  // In Progress
  if (inProgressSpecs.length > 0) {
    console.log(
      chalk.bold(`⏳ In Progress (${inProgressSpecs.length})`)
    );
    console.log('');

    for (const spec of inProgressSpecs.slice(0, 5)) {
      const priorityBadge = getPriorityBadge(spec.priority);

      const assigneeBadge = spec.assignee
        ? chalk.dim(`@${spec.assignee}`)
        : '';

      const ageBadge =
        spec.ageInDays > 14
          ? chalk.red(`${spec.ageInDays}d`)
          : chalk.dim(`${spec.ageInDays}d`);

      console.log(
        `  ${priorityBadge} ${spec.path} ${ageBadge} ${assigneeBadge}`
      );
    }

    if (inProgressSpecs.length > 5) {
      console.log(
        `  ${chalk.dim(`...and ${inProgressSpecs.length - 5} more`)}`
      );
    }

    console.log('');
  }

  // Top Tags
  if (topTags.length > 0) {
    console.log(chalk.bold('🏷️  Top Tags'));
    console.log('');

    for (const { tag, count } of topTags) {
      console.log(`  ${chalk.magenta(`#${tag}`)} ${chalk.dim(`(${count})`)}`);
    }

    console.log('');
  }

  // Quick Actions
  console.log(chalk.bold.dim('💡 Quick Actions'));
  console.log('');
  console.log(`  ${chalk.dim('lspec board')}          View Kanban board`);
  console.log(`  ${chalk.dim('lspec analytics')}      Detailed analytics`);
  console.log(`  ${chalk.dim('lspec list')}           Browse all specs`);
  console.log('');
}
