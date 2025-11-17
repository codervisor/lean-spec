/**
 * Tokens command - count tokens in specs and sub-specs
 * 
 * Implements spec 069: Token Counting Utilities
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { TokenCounter, type TokenCount } from '@leanspec/core';
import { loadAllSpecs } from '../spec-loader.js';
import { resolveSpecPath } from '../utils/path-helpers.js';
import { sanitizeUserInput, withSpinner } from '../utils/ui.js';
import { autoCheckIfEnabled } from './check.js';
import { loadConfig } from '../config.js';
import * as path from 'node:path';

export interface TokensOptions {
  detailed?: boolean;       // Show content breakdown
  includeSubSpecs?: boolean; // Count sub-spec files
  all?: boolean;            // Show all specs
  sortBy?: 'tokens' | 'lines' | 'name'; // Sort order
  json?: boolean;           // JSON output
}

export function tokensCommand(): Command;
export function tokensCommand(specPath: string, options?: TokensOptions): Promise<void>;
export function tokensCommand(specPath?: string, options: TokensOptions = {}): Command | Promise<void> {
  if (typeof specPath === 'string') {
    return countSpecTokens(specPath, options);
  }

  return new Command('tokens')
    .description('Count tokens in spec(s) for LLM context management')
    .argument('[spec]', 'Spec to count tokens for (optional)')
    .option('--detailed', 'Show content type breakdown (code, prose, tables)')
    .option('--include-sub-specs', 'Count all sub-spec files (DESIGN.md, etc.)')
    .option('--all', 'Show all specs (when [spec] is omitted)')
    .option('--sort-by <field>', 'Sort by: tokens, lines, name (default: tokens)')
    .option('--json', 'Output as JSON')
    .action(async (specPathArg: string | undefined, opts: TokensOptions) => {
      if (specPathArg) {
        await countSpecTokens(specPathArg, opts);
      } else {
        await tokensAllCommand(opts);
      }
    });
}

/**
 * Count tokens in a single spec
 */
export async function countSpecTokens(specPath: string, options: TokensOptions = {}): Promise<void> {
  await autoCheckIfEnabled();

  const counter = new TokenCounter();
  
  try {
    // Resolve spec path (handles numbers like "14" or "014")
    const config = await loadConfig();
    const cwd = process.cwd();
    const specsDir = path.join(cwd, config.specsDir);
    const resolvedPath = await resolveSpecPath(specPath, cwd, specsDir);
    
    if (!resolvedPath) {
      throw new Error(`Spec not found: ${sanitizeUserInput(specPath)}`);
    }

    // Extract spec name from path
    const specName = path.basename(resolvedPath);
    
    // Count tokens
    const result = await counter.countSpec(resolvedPath, {
      detailed: options.detailed,
      includeSubSpecs: options.includeSubSpecs,
    });

    // JSON output
    if (options.json) {
      console.log(JSON.stringify({
        spec: specName,
        path: resolvedPath,
        ...result,
      }, null, 2));
      return;
    }

    // Display results
    console.log(chalk.bold.cyan(`📊 Token Count: ${specName}`));
    console.log('');
    
    // Total
    const indicators = counter.getPerformanceIndicators(result.total);
    const levelEmoji = indicators.level === 'excellent' ? '✅' :
                      indicators.level === 'good' ? '👍' :
                      indicators.level === 'warning' ? '⚠️' : '🔴';
    
    console.log(`  Total: ${chalk.cyan(result.total.toLocaleString())} tokens ${levelEmoji}`);
    console.log('');

    // Files breakdown
    if (result.files.length > 1 || options.detailed) {
      console.log(chalk.bold('Files:'));
      console.log('');
      
      for (const file of result.files) {
        const lineInfo = file.lines ? chalk.dim(` (${file.lines} lines)`) : '';
        console.log(`  ${file.path.padEnd(25)}  ${chalk.cyan(file.tokens.toLocaleString().padStart(6))} tokens${lineInfo}`);
      }
      console.log('');
    }

    // Content breakdown
    if (options.detailed && result.breakdown) {
      const b = result.breakdown;
      const total = b.code + b.prose + b.tables + b.frontmatter;
      
      console.log(chalk.bold('Content Breakdown:'));
      console.log('');
      console.log(`  Prose       ${chalk.cyan(b.prose.toLocaleString().padStart(6))} tokens  ${chalk.dim(`(${Math.round(b.prose / total * 100)}%)`)}`);
      console.log(`  Code        ${chalk.cyan(b.code.toLocaleString().padStart(6))} tokens  ${chalk.dim(`(${Math.round(b.code / total * 100)}%)`)}`);
      console.log(`  Tables      ${chalk.cyan(b.tables.toLocaleString().padStart(6))} tokens  ${chalk.dim(`(${Math.round(b.tables / total * 100)}%)`)}`);
      console.log(`  Frontmatter ${chalk.cyan(b.frontmatter.toLocaleString().padStart(6))} tokens  ${chalk.dim(`(${Math.round(b.frontmatter / total * 100)}%)`)}`);
      console.log('');
    }

    // Performance indicators
    console.log(chalk.bold('Performance Indicators:'));
    console.log('');
    
    const costColor = indicators.costMultiplier < 2 ? chalk.green :
                     indicators.costMultiplier < 4 ? chalk.yellow :
                     chalk.red;
    const effectivenessColor = indicators.effectiveness >= 95 ? chalk.green :
                              indicators.effectiveness >= 85 ? chalk.yellow :
                              chalk.red;
    
    console.log(`  Cost multiplier:  ${costColor(`${indicators.costMultiplier}x`)} ${chalk.dim('vs 1,200 token baseline')}`);
    console.log(`  AI effectiveness: ${effectivenessColor(`~${indicators.effectiveness}%`)} ${chalk.dim('(hypothesis)')}`);
    console.log(`  Context Economy:  ${levelEmoji} ${indicators.recommendation}`);
    console.log('');

    // Show hint about sub-specs
    if (!options.includeSubSpecs && result.files.length === 1) {
      console.log(chalk.dim('💡 Use `--include-sub-specs` to count all sub-spec files'));
    }
  } finally {
    counter.dispose();
  }
}

/**
 * Show token counts for all specs
 */
export async function tokensAllCommand(options: TokensOptions = {}): Promise<void> {
  await autoCheckIfEnabled();

  // Load all specs
  const specs = await withSpinner(
    'Loading specs...',
    () => loadAllSpecs({ includeArchived: false })
  );

  if (specs.length === 0) {
    console.log('No specs found.');
    return;
  }

  // Count tokens for each spec
  const counter = new TokenCounter();
  const results: Array<{
    name: string;
    path: string;
    tokens: number;
    lines: number;
    level: string;
  }> = [];

  try {
    for (const spec of specs) {
      const result = await counter.countSpec(spec.fullPath, {
        includeSubSpecs: options.includeSubSpecs,
      });
      
      const indicators = counter.getPerformanceIndicators(result.total);
      const totalLines = result.files.reduce((sum: number, f: { lines?: number }) => sum + (f.lines || 0), 0);
      
      results.push({
        name: spec.name,
        path: spec.fullPath,
        tokens: result.total,
        lines: totalLines,
        level: indicators.level,
      });
    }
  } finally {
    counter.dispose();
  }

  // Sort results
  const sortBy = options.sortBy || 'tokens';
  results.sort((a, b) => {
    if (sortBy === 'tokens') return b.tokens - a.tokens;
    if (sortBy === 'lines') return b.lines - a.lines;
    return a.name.localeCompare(b.name);
  });

  // JSON output
  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // Display results
  console.log(chalk.bold.cyan('📊 Token Counts'));
  console.log('');
  console.log(chalk.dim(`Sorted by: ${sortBy}`));
  console.log('');

  // Calculate stats
  const totalTokens = results.reduce((sum, r) => sum + r.tokens, 0);
  const avgTokens = Math.round(totalTokens / results.length);
  const warningCount = results.filter(r => r.level === 'warning' || r.level === 'problem').length;

  // Summary
  console.log(chalk.bold('Summary:'));
  console.log('');
  console.log(`  Total specs:    ${chalk.cyan(results.length)}`);
  console.log(`  Total tokens:   ${chalk.cyan(totalTokens.toLocaleString())}`);
  console.log(`  Average tokens: ${chalk.cyan(avgTokens.toLocaleString())}`);
  
  if (warningCount > 0) {
    console.log(`  Needs review:   ${chalk.yellow(warningCount)} specs ${chalk.dim('(⚠️  or 🔴)')}`);
  }
  console.log('');

  // Table header
  const nameCol = 35;
  const tokensCol = 10;
  const linesCol = 8;
  
  console.log(chalk.bold(
    'Spec'.padEnd(nameCol) + 
    'Tokens'.padStart(tokensCol) + 
    'Lines'.padStart(linesCol) + 
    '  Status'
  ));
  console.log(chalk.dim('─'.repeat(nameCol + tokensCol + linesCol + 10)));

  // Table rows (show top 20 or all if --all)
  const displayCount = options.all ? results.length : Math.min(20, results.length);
  
  for (let i = 0; i < displayCount; i++) {
    const r = results[i];
    const emoji = r.level === 'excellent' ? '✅' :
                 r.level === 'good' ? '👍' :
                 r.level === 'warning' ? '⚠️' : '🔴';
    
    const tokensColor = r.level === 'excellent' || r.level === 'good' ? chalk.cyan :
                       r.level === 'warning' ? chalk.yellow :
                       chalk.red;
    
    const name = r.name.length > nameCol - 2 ? r.name.substring(0, nameCol - 3) + '…' : r.name;
    
    console.log(
      name.padEnd(nameCol) +
      tokensColor(r.tokens.toLocaleString().padStart(tokensCol)) +
      chalk.dim(r.lines.toString().padStart(linesCol)) +
      `  ${emoji}`
    );
  }

  if (results.length > displayCount) {
    console.log('');
    console.log(chalk.dim(`... and ${results.length - displayCount} more specs`));
    console.log(chalk.dim(`Use --all to show all specs`));
  }

  console.log('');
  console.log(chalk.dim('Legend: ✅ excellent (<2K) | 👍 good (<3.5K) | ⚠️  warning (<5K) | 🔴 problem (>5K)'));
  console.log('');
}
