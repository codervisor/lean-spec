import chalk from 'chalk';
import { loadAllSpecs } from '../spec-loader.js';
import type { SpecStatus, SpecPriority, SpecFilterOptions } from '../frontmatter.js';

export async function statsCommand(options: {
  tag?: string;
  assignee?: string;
  json?: boolean;
}): Promise<void> {
  // Build filter
  const filter: SpecFilterOptions = {};
  if (options.tag) {
    filter.tags = [options.tag];
  }
  if (options.assignee) {
    filter.assignee = options.assignee;
  }

  // Load all specs (including archived for total count)
  const specs = await loadAllSpecs({
    includeArchived: true,
    filter,
  });

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
    // Count by status
    statusCounts[spec.frontmatter.status]++;

    // Count by priority
    if (spec.frontmatter.priority) {
      priorityCounts[spec.frontmatter.priority]++;
    }

    // Count by tags
    if (spec.frontmatter.tags) {
      for (const tag of spec.frontmatter.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
  }

  // Sort tags by count
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

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

  // Output as formatted text
  console.log('');
  console.log(chalk.green('📊 Spec Statistics'));
  
  // Show filter info if applied
  if (options.tag || options.assignee) {
    const filters: string[] = [];
    if (options.tag) filters.push(`tag=${options.tag}`);
    if (options.assignee) filters.push(`assignee=${options.assignee}`);
    console.log(chalk.gray(`Filtered by: ${filters.join(', ')}`));
  }
  
  console.log('');

  // Status breakdown
  console.log(chalk.bold('Status:'));
  console.log(`  📅 Planned:      ${chalk.cyan(statusCounts.planned.toString().padStart(3))}`);
  console.log(`  🔨 In Progress:  ${chalk.yellow(statusCounts['in-progress'].toString().padStart(3))}`);
  console.log(`  ✅ Complete:     ${chalk.green(statusCounts.complete.toString().padStart(3))}`);
  console.log(`  📦 Archived:     ${chalk.gray(statusCounts.archived.toString().padStart(3))}`);
  console.log('');

  // Priority breakdown (if any specs have priority)
  const totalWithPriority = Object.values(priorityCounts).reduce((sum, count) => sum + count, 0);
  if (totalWithPriority > 0) {
    console.log(chalk.bold('Priority:'));
    if (priorityCounts.critical > 0) {
      console.log(`  🔴 Critical:     ${chalk.red(priorityCounts.critical.toString().padStart(3))}`);
    }
    if (priorityCounts.high > 0) {
      console.log(`  🟡 High:         ${chalk.yellow(priorityCounts.high.toString().padStart(3))}`);
    }
    if (priorityCounts.medium > 0) {
      console.log(`  🟠 Medium:       ${chalk.blue(priorityCounts.medium.toString().padStart(3))}`);
    }
    if (priorityCounts.low > 0) {
      console.log(`  🟢 Low:          ${chalk.gray(priorityCounts.low.toString().padStart(3))}`);
    }
    console.log('');
  }

  // Top tags (if any)
  if (topTags.length > 0) {
    console.log(chalk.bold(`Tags (top ${topTags.length}):`));
    for (const [tag, count] of topTags) {
      console.log(`  ${tag.padEnd(20)} ${chalk.cyan(count.toString().padStart(3))}`);
    }
    console.log('');
  }

  // Total
  console.log(chalk.bold(`Total Specs: ${chalk.green(specs.length.toString())}`));
  console.log('');
}
