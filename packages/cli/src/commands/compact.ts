/**
 * Compact command - remove specified content
 * 
 * Implements spec 059: Programmatic Spec Management
 * 
 * Mechanically removes specified line ranges.
 * AI agents identify redundancy, this tool executes removal.
 * 
 * No semantic analysis - just mechanical deletion.
 */

import chalk from 'chalk';
import * as path from 'node:path';
import { Command } from 'commander';
import { readFile, writeFile } from 'node:fs/promises';
import { removeLines, countLines, extractLines } from '@leanspec/core';
import { loadConfig } from '../config.js';
import { resolveSpecPath } from '../utils/path-helpers.js';
import { sanitizeUserInput } from '../utils/ui.js';
import { autoCheckIfEnabled } from './check.js';

export interface CompactOptions {
  removes: string[]; // Array of line ranges like "145-153"
  dryRun?: boolean;  // Show what would be removed
  force?: boolean;   // Skip confirmation
}

interface ParsedRemove {
  startLine: number;
  endLine: number;
  originalIndex: number; // Track original order for better reporting
}

// Helper function to collect multiple --remove options
function collectRemoves(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

/**
 * Compact command - remove specified line ranges
 */
export function compactCommand(): Command {
  return new Command('compact')
    .description('Remove specified line ranges from spec (spec 059)')
    .argument('<spec>', 'Spec to compact')
    .option('--remove <lines>', 'Line range to remove (e.g., 145-153)', collectRemoves, [])
    .option('--dry-run', 'Show what would be removed without making changes')
    .option('--force', 'Skip confirmation')
    .action(async (specPath: string, options: { remove: string[]; dryRun?: boolean; force?: boolean }) => {
      await compactSpec(specPath, {
        removes: options.remove,
        dryRun: options.dryRun,
        force: options.force,
      });
    });
}

/**
 * Compact spec by removing specified line ranges
 */
export async function compactSpec(specPath: string, options: CompactOptions): Promise<void> {
  await autoCheckIfEnabled();
  
  try {
    // Validate options
    if (!options.removes || options.removes.length === 0) {
      throw new Error('At least one --remove option is required');
    }
    
    // Resolve spec path
    const config = await loadConfig();
    const cwd = process.cwd();
    const specsDir = path.join(cwd, config.specsDir);
    const resolvedPath = await resolveSpecPath(specPath, cwd, specsDir);
    
    if (!resolvedPath) {
      throw new Error(`Spec not found: ${sanitizeUserInput(specPath)}`);
    }

    // Read source spec
    const specName = path.basename(resolvedPath);
    const readmePath = path.join(resolvedPath, 'README.md');
    const content = await readFile(readmePath, 'utf-8');
    
    // Parse remove specifications
    const parsedRemoves = parseRemoveSpecs(options.removes);
    
    // Validate no overlapping ranges
    validateNoOverlaps(parsedRemoves);
    
    // Dry run mode
    if (options.dryRun) {
      await displayDryRun(specName, content, parsedRemoves);
      return;
    }
    
    // Execute compaction
    await executeCompact(readmePath, specName, content, parsedRemoves);
    
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
    throw error;
  }
}

/**
 * Parse remove specifications from command line
 */
function parseRemoveSpecs(removes: string[]): ParsedRemove[] {
  const parsed: ParsedRemove[] = [];
  
  for (let i = 0; i < removes.length; i++) {
    const spec = removes[i];
    
    // Format: "145-153" or "234-256"
    const match = spec.match(/^(\d+)-(\d+)$/);
    
    if (!match) {
      throw new Error(`Invalid line range format: ${spec}. Expected format: "145-153"`);
    }
    
    const startLine = parseInt(match[1], 10);
    const endLine = parseInt(match[2], 10);
    
    if (startLine < 1 || endLine < startLine) {
      throw new Error(`Invalid line range: ${spec}`);
    }
    
    parsed.push({
      startLine,
      endLine,
      originalIndex: i,
    });
  }
  
  return parsed;
}

/**
 * Validate no overlapping line ranges
 */
function validateNoOverlaps(removes: ParsedRemove[]): void {
  const sorted = [...removes].sort((a, b) => a.startLine - b.startLine);
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    
    if (current.endLine >= next.startLine) {
      throw new Error(
        `Overlapping line ranges: ${current.startLine}-${current.endLine} ` +
        `overlaps with ${next.startLine}-${next.endLine}`
      );
    }
  }
}

/**
 * Display dry-run output
 */
async function displayDryRun(
  specName: string,
  content: string,
  removes: ParsedRemove[]
): Promise<void> {
  console.log(chalk.bold.cyan(`📋 Compact Preview: ${specName}`));
  console.log('');
  
  console.log(chalk.bold('Would remove:'));
  console.log('');
  
  let totalLines = 0;
  
  for (const remove of removes) {
    const lineCount = remove.endLine - remove.startLine + 1;
    totalLines += lineCount;
    
    // Extract content to show what will be removed
    const removedContent = extractLines(content, remove.startLine, remove.endLine);
    const previewLines = removedContent.split('\n').slice(0, 3);
    
    console.log(`  Lines ${remove.startLine}-${remove.endLine} (${lineCount} lines)`);
    console.log(chalk.dim('    Preview:'));
    for (const line of previewLines) {
      console.log(chalk.dim(`      ${line.substring(0, 60)}${line.length > 60 ? '...' : ''}`));
    }
    if (removedContent.split('\n').length > 3) {
      console.log(chalk.dim(`      ... (${removedContent.split('\n').length - 3} more lines)`));
    }
    console.log('');
  }
  
  // Calculate stats
  const originalLines = countLines(content);
  const remainingLines = originalLines - totalLines;
  const percentage = Math.round((totalLines / originalLines) * 100);
  
  console.log(chalk.bold('Summary:'));
  console.log(`  Original lines:  ${chalk.cyan(originalLines)}`);
  console.log(`  Removing:        ${chalk.yellow(totalLines)} lines (${percentage}%)`);
  console.log(`  Remaining lines: ${chalk.cyan(remainingLines)}`);
  console.log('');
  
  console.log(chalk.dim('No files modified (dry run)'));
  console.log(chalk.dim('Run without --dry-run to apply changes'));
  console.log('');
}

/**
 * Execute the compaction operation
 */
async function executeCompact(
  readmePath: string,
  specName: string,
  content: string,
  removes: ParsedRemove[]
): Promise<void> {
  console.log(chalk.bold.cyan(`🗜️  Compacting: ${specName}`));
  console.log('');
  
  // Sort removes in reverse order to maintain line numbers during removal
  const sorted = [...removes].sort((a, b) => b.startLine - a.startLine);
  
  // Apply each removal
  let updatedContent = content;
  let totalRemoved = 0;
  
  for (const remove of sorted) {
    const lineCount = remove.endLine - remove.startLine + 1;
    updatedContent = removeLines(updatedContent, remove.startLine, remove.endLine);
    totalRemoved += lineCount;
    
    console.log(chalk.green(`✓ Removed lines ${remove.startLine}-${remove.endLine} (${lineCount} lines)`));
  }
  
  // Write updated content
  await writeFile(readmePath, updatedContent, 'utf-8');
  
  // Calculate final stats
  const originalLines = countLines(content);
  const finalLines = countLines(updatedContent);
  const percentage = Math.round((totalRemoved / originalLines) * 100);
  
  console.log('');
  console.log(chalk.bold.green('Compaction complete!'));
  console.log(chalk.dim(`Removed ${totalRemoved} lines (${percentage}%)`));
  console.log(chalk.dim(`${originalLines} → ${finalLines} lines`));
  console.log('');
}
