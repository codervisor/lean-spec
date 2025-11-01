import chalk from 'chalk';
import { loadAllSpecs, type SpecInfo } from '../spec-loader.js';
import type { SpecStatus, SpecFilterOptions } from '../frontmatter.js';

export async function boardCommand(options: {
  showComplete?: boolean;
  tag?: string;
  assignee?: string;
}): Promise<void> {
  // Build filter
  const filter: SpecFilterOptions = {};
  if (options.tag) {
    filter.tags = [options.tag];
  }
  if (options.assignee) {
    filter.assignee = options.assignee;
  }

  // Load all specs (exclude archived, they go in their own archive view)
  const specs = await loadAllSpecs({
    includeArchived: false,
    filter,
  });

  if (specs.length === 0) {
    console.log('No specs found.');
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
    columns[spec.frontmatter.status].push(spec);
  }

  // Display board
  console.log('');
  console.log(chalk.green('📋 Spec Board'));
  
  // Show filter info if applied
  if (options.tag || options.assignee) {
    const filters: string[] = [];
    if (options.tag) filters.push(`tag=${options.tag}`);
    if (options.assignee) filters.push(`assignee=${options.assignee}`);
    console.log(chalk.gray(`Filtered by: ${filters.join(', ')}`));
  }
  
  console.log('');

  // Display each column
  displayColumn('📅 Planned', columns.planned, true);
  displayColumn('🔨 In Progress', columns['in-progress'], true);
  
  if (options.showComplete) {
    displayColumn('✅ Complete', columns.complete, true);
  } else {
    displayColumn('✅ Complete', columns.complete, false);
  }
  
  console.log('');
}

function displayColumn(title: string, specs: SpecInfo[], expanded: boolean): void {
  const boxWidth = 60;
  const count = specs.length;
  
  // Top border
  console.log(`┌─ ${title} (${count}) ${'─'.repeat(Math.max(0, boxWidth - title.length - count.toString().length - 6))}┐`);
  
  if (expanded && specs.length > 0) {
    // Show each spec
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      console.log(`│ ${chalk.cyan(spec.path.padEnd(boxWidth - 2))}│`);
      
      // Metadata line
      const meta: string[] = [];
      
      if (spec.frontmatter.tags && spec.frontmatter.tags.length > 0) {
        meta.push(chalk.gray(`[${spec.frontmatter.tags.join(', ')}]`));
      }
      
      if (spec.frontmatter.priority) {
        const priorityLabel = spec.frontmatter.priority;
        let colorFn = chalk.gray;
        if (priorityLabel === 'high') colorFn = chalk.yellow;
        if (priorityLabel === 'critical') colorFn = chalk.red;
        meta.push(colorFn(`priority: ${priorityLabel}`));
      }
      
      if (spec.frontmatter.assignee) {
        meta.push(chalk.blue(`assignee: ${spec.frontmatter.assignee}`));
      }
      
      if (meta.length > 0) {
        const metaLine = `  ${meta.join('  ')}`;
        // Truncate if too long
        const maxLen = boxWidth - 2;
        const displayLine = metaLine.length > maxLen 
          ? metaLine.substring(0, maxLen - 3) + '...' 
          : metaLine;
        console.log(`│ ${displayLine.padEnd(boxWidth - 2)}│`);
      }
      
      // Add spacing between specs (except last one)
      if (i < specs.length - 1) {
        console.log(`│ ${' '.repeat(boxWidth - 2)}│`);
      }
    }
  } else if (!expanded && specs.length > 0) {
    // Collapsed view
    console.log(`│ ${chalk.gray(`(collapsed, use --show-complete to expand)`.padEnd(boxWidth - 2))}│`);
  } else {
    // Empty column
    console.log(`│ ${chalk.gray('(no specs)'.padEnd(boxWidth - 2))}│`);
  }
  
  // Bottom border
  console.log(`└${'─'.repeat(boxWidth)}┘`);
  console.log('');
}
