import React from 'react';
import { render } from 'ink';
import chalk from 'chalk';
import { loadAllSpecs } from '../spec-loader.js';
import type { SpecStatus, SpecPriority, SpecFilterOptions } from '../frontmatter.js';
import { SpecList } from '../components/SpecList.js';
import { withSpinner } from '../utils/ui.js';

export async function searchCommand(query: string, options: {
  status?: SpecStatus;
  tag?: string;
  priority?: SpecPriority;
  assignee?: string;
  customFields?: Record<string, unknown>;
}): Promise<void> {
  // Build filter
  const filter: SpecFilterOptions = {};
  if (options.status) filter.status = options.status;
  if (options.tag) filter.tags = [options.tag];
  if (options.priority) filter.priority = options.priority;
  if (options.assignee) filter.assignee = options.assignee;
  if (options.customFields) filter.customFields = options.customFields;

  // Load all specs with content and spinner
  const specs = await withSpinner(
    'Searching specs...',
    () => loadAllSpecs({
      includeArchived: true,
      includeContent: true,
      filter,
    })
  );

  if (specs.length === 0) {
    console.log('No specs found matching filters.');
    return;
  }

  // Search for query in content
  const results: Array<{
    spec: typeof specs[0];
    matches: string[];
  }> = [];

  const queryLower = query.toLowerCase();

  for (const spec of specs) {
    if (!spec.content) continue;

    const matches: string[] = [];
    
    // Search in content
    const lines = spec.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes(queryLower)) {
        // Get context: current line with some surrounding context
        const contextStart = Math.max(0, i - 1);
        const contextEnd = Math.min(lines.length - 1, i + 1);
        const context = lines.slice(contextStart, contextEnd + 1);
        
        // Highlight the matching line
        const matchLine = context[i - contextStart];
        const highlighted = highlightMatch(matchLine, query);
        
        matches.push(highlighted);
      }
    }

    if (matches.length > 0) {
      results.push({ spec, matches });
    }
  }

  // Display results
  if (results.length === 0) {
    console.log('');
    console.log(chalk.yellow(`🔍 No specs found matching "${query}"`));
    
    // Show active filters
    if (Object.keys(filter).length > 0) {
      const filters: string[] = [];
      if (options.status) filters.push(`status=${options.status}`);
      if (options.tag) filters.push(`tag=${options.tag}`);
      if (options.priority) filters.push(`priority=${options.priority}`);
      if (options.assignee) filters.push(`assignee=${options.assignee}`);
      console.log(chalk.gray(`With filters: ${filters.join(', ')}`));
    }
    console.log('');
    return;
  }

  // Show summary header
  console.log('');
  console.log(chalk.green(`🔍 Found ${results.length} spec${results.length === 1 ? '' : 's'} matching "${query}"`));
  
  // Show active filters
  if (Object.keys(filter).length > 0) {
    const filters: string[] = [];
    if (options.status) filters.push(`status=${options.status}`);
    if (options.tag) filters.push(`tag=${options.tag}`);
    if (options.priority) filters.push(`priority=${options.priority}`);
    if (options.assignee) filters.push(`assignee=${options.assignee}`);
    console.log(chalk.gray(`With filters: ${filters.join(', ')}`));
  }
  console.log('');

  // Display each result with matches
  for (const result of results) {
    const { spec, matches } = result;
    
    // Spec header
    console.log(chalk.cyan(`${spec.frontmatter.status === 'in-progress' ? '🔨' : spec.frontmatter.status === 'complete' ? '✅' : '📅'} ${spec.path}`));
    
    // Metadata
    const meta: string[] = [];
    if (spec.frontmatter.priority) {
      const priorityEmoji = spec.frontmatter.priority === 'critical' ? '🔴' : 
                           spec.frontmatter.priority === 'high' ? '🟡' :
                           spec.frontmatter.priority === 'medium' ? '🟠' : '🟢';
      meta.push(`${priorityEmoji} ${spec.frontmatter.priority}`);
    }
    if (spec.frontmatter.tags && spec.frontmatter.tags.length > 0) {
      meta.push(`[${spec.frontmatter.tags.join(', ')}]`);
    }
    if (meta.length > 0) {
      console.log(chalk.gray(`  ${meta.join(' • ')}`));
    }
    
    // Show first few matches (limit to 3 per spec)
    const maxMatches = 3;
    for (let i = 0; i < Math.min(matches.length, maxMatches); i++) {
      console.log(`  ${chalk.gray('Match:')} ${matches[i].trim()}`);
    }
    
    if (matches.length > maxMatches) {
      console.log(chalk.gray(`  ... and ${matches.length - maxMatches} more match${matches.length - maxMatches === 1 ? '' : 'es'}`));
    }
    
    console.log('');
  }
}

function highlightMatch(text: string, query: string): string {
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, chalk.yellow('$1'));
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
