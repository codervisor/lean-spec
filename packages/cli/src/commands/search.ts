import React from 'react';
import { render } from 'ink';
import chalk from 'chalk';
import { Command } from 'commander';
import { loadAllSpecs } from '../spec-loader.js';
import type { SpecStatus, SpecPriority, SpecFilterOptions } from '../frontmatter.js';
import { withSpinner } from '../utils/ui.js';
import { autoCheckIfEnabled } from './check.js';
import { sanitizeUserInput } from '../utils/ui.js';
import { searchSpecs, type SearchableSpec } from '@leanspec/core';
import { parseCustomFieldOptions } from '../utils/cli-helpers.js';

/**
 * Search command - full-text search with metadata filters
 */
export function searchCommand(): Command {
  return new Command('search')
    .description('Full-text search with metadata filters')
    .argument('<query>', 'Search query')
    .option('--status <status>', 'Filter by status')
    .option('--tag <tag>', 'Filter by tag')
    .option('--priority <priority>', 'Filter by priority')
    .option('--assignee <name>', 'Filter by assignee')
    .option('--field <name=value...>', 'Filter by custom field (can specify multiple)')
    .action(async (query: string, options: {
      status?: SpecStatus;
      tag?: string;
      priority?: SpecPriority;
      assignee?: string;
      field?: string[];
    }) => {
      const customFields = parseCustomFieldOptions(options.field);
      await performSearch(query, {
        status: options.status,
        tag: options.tag,
        priority: options.priority,
        assignee: options.assignee,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      });
    });
}

export async function performSearch(query: string, options: {
  status?: SpecStatus;
  tag?: string;
  priority?: SpecPriority;
  assignee?: string;
  customFields?: Record<string, unknown>;
}): Promise<void> {
  // Auto-check for conflicts before search
  await autoCheckIfEnabled();
  
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

  // Convert to searchable format
  const searchableSpecs: SearchableSpec[] = specs.map(spec => ({
    path: spec.path,
    name: spec.path,
    status: spec.frontmatter.status,
    priority: spec.frontmatter.priority,
    tags: spec.frontmatter.tags,
    title: typeof spec.frontmatter.title === 'string' ? spec.frontmatter.title : undefined,
    description: typeof spec.frontmatter.description === 'string' ? spec.frontmatter.description : undefined,
    content: spec.content,
  }));

  // Use intelligent search engine
  const searchResult = searchSpecs(query, searchableSpecs, {
    maxMatchesPerSpec: 5,
    contextLength: 80,
  });

  const { results, metadata } = searchResult;

  // Display results
  if (results.length === 0) {
    console.log('');
    console.log(chalk.yellow(`🔍 No specs found matching "${sanitizeUserInput(query)}"`));
    
    // Show active filters
    if (Object.keys(filter).length > 0) {
      const filters: string[] = [];
      if (options.status) filters.push(`status=${sanitizeUserInput(options.status)}`);
      if (options.tag) filters.push(`tag=${sanitizeUserInput(options.tag)}`);
      if (options.priority) filters.push(`priority=${sanitizeUserInput(options.priority)}`);
      if (options.assignee) filters.push(`assignee=${sanitizeUserInput(options.assignee)}`);
      console.log(chalk.gray(`With filters: ${filters.join(', ')}`));
    }
    console.log('');
    return;
  }

  // Show summary header with metadata
  console.log('');
  console.log(chalk.green(`🔍 Found ${results.length} spec${results.length === 1 ? '' : 's'} matching "${sanitizeUserInput(query)}"`));
  console.log(chalk.gray(`   Searched ${metadata.specsSearched} specs in ${metadata.searchTime}ms`));
  
  // Show active filters
  if (Object.keys(filter).length > 0) {
    const filters: string[] = [];
    if (options.status) filters.push(`status=${sanitizeUserInput(options.status)}`);
    if (options.tag) filters.push(`tag=${sanitizeUserInput(options.tag)}`);
    if (options.priority) filters.push(`priority=${sanitizeUserInput(options.priority)}`);
    if (options.assignee) filters.push(`assignee=${sanitizeUserInput(options.assignee)}`);
    console.log(chalk.gray(`   With filters: ${filters.join(', ')}`));
  }
  console.log('');

  // Display each result with matches
  for (const result of results) {
    const { spec, matches, score, totalMatches } = result;
    
    // Spec header with relevance score
    const statusEmoji = spec.status === 'in-progress' ? '🔨' : 
                       spec.status === 'complete' ? '✅' : '📅';
    console.log(chalk.cyan(`${statusEmoji} ${sanitizeUserInput(spec.path)} ${chalk.gray(`(${score}% match)`)}`));
    
    // Metadata
    const meta: string[] = [];
    if (spec.priority) {
      const priorityEmoji = spec.priority === 'critical' ? '🔴' : 
                           spec.priority === 'high' ? '🟡' :
                           spec.priority === 'medium' ? '🟠' : '🟢';
      meta.push(`${priorityEmoji} ${sanitizeUserInput(spec.priority)}`);
    }
    if (spec.tags && spec.tags.length > 0) {
      meta.push(`[${spec.tags.map(tag => sanitizeUserInput(tag)).join(', ')}]`);
    }
    if (meta.length > 0) {
      console.log(chalk.gray(`   ${meta.join(' • ')}`));
    }
    
    // Show title if it matched
    const titleMatch = matches.find(m => m.field === 'title');
    if (titleMatch) {
      console.log(`   ${chalk.bold('Title:')} ${highlightMatches(titleMatch.text, titleMatch.highlights)}`);
    }
    
    // Show description if it matched
    const descMatch = matches.find(m => m.field === 'description');
    if (descMatch) {
      console.log(`   ${chalk.bold('Description:')} ${highlightMatches(descMatch.text, descMatch.highlights)}`);
    }
    
    // Show tag matches
    const tagMatches = matches.filter(m => m.field === 'tags');
    if (tagMatches.length > 0) {
      console.log(`   ${chalk.bold('Tags:')} ${tagMatches.map(m => highlightMatches(m.text, m.highlights)).join(', ')}`);
    }
    
    // Show content matches
    const contentMatches = matches.filter(m => m.field === 'content');
    if (contentMatches.length > 0) {
      console.log(`   ${chalk.bold('Content matches:')}`);
      for (const match of contentMatches) {
        const lineInfo = match.lineNumber ? chalk.gray(`[L${match.lineNumber}]`) : '';
        console.log(`   ${lineInfo} ${highlightMatches(match.text, match.highlights)}`);
      }
    }
    
    if (totalMatches > matches.length) {
      console.log(chalk.gray(`   ... and ${totalMatches - matches.length} more match${totalMatches - matches.length === 1 ? '' : 'es'}`));
    }
    
    console.log('');
  }
}

/**
 * Highlight matches in text using character ranges
 */
function highlightMatches(text: string, highlights: Array<[number, number]>): string {
  if (highlights.length === 0) return text;

  let result = '';
  let lastEnd = 0;

  for (const [start, end] of highlights) {
    result += text.substring(lastEnd, start);
    result += chalk.yellow(text.substring(start, end));
    lastEnd = end;
  }
  result += text.substring(lastEnd);

  return result;
}
