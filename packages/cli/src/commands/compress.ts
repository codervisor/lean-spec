/**
 * Compress command - replace content with summary
 * 
 * Implements spec 059: Programmatic Spec Management
 * 
 * Mechanically replaces specified line ranges with AI-provided summaries.
 * AI agents generate summaries, this tool executes replacement.
 * 
 * No semantic analysis - just mechanical text replacement.
 */

import chalk from 'chalk';
import * as path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { replaceLines, countLines, extractLines } from '@leanspec/core';
import { loadConfig } from '../config.js';
import { resolveSpecPath } from '../utils/path-helpers.js';
import { sanitizeUserInput } from '../utils/ui.js';
import { autoCheckIfEnabled } from './check.js';

export interface CompressOptions {
  replaces: Array<{
    lines: string; // Format: "142-284"
    text: string;  // Replacement text
  }>;
  dryRun?: boolean;  // Show what would be replaced
  force?: boolean;   // Skip confirmation
}

interface ParsedReplace {
  startLine: number;
  endLine: number;
  text: string;
  originalIndex: number;
}

/**
 * Compress spec by replacing specified line ranges with summaries
 */
export async function compressCommand(specPath: string, options: CompressOptions): Promise<void> {
  await autoCheckIfEnabled();
  
  try {
    // Validate options
    if (!options.replaces || options.replaces.length === 0) {
      throw new Error('At least one --replace option is required');
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
    
    // Parse replace specifications
    const parsedReplaces = parseReplaceSpecs(options.replaces);
    
    // Validate no overlapping ranges
    validateNoOverlaps(parsedReplaces);
    
    // Dry run mode
    if (options.dryRun) {
      await displayDryRun(specName, content, parsedReplaces);
      return;
    }
    
    // Execute compression
    await executeCompress(readmePath, specName, content, parsedReplaces);
    
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
    throw error;
  }
}

/**
 * Parse replace specifications from command line
 */
function parseReplaceSpecs(replaces: CompressOptions['replaces']): ParsedReplace[] {
  const parsed: ParsedReplace[] = [];
  
  for (let i = 0; i < replaces.length; i++) {
    const spec = replaces[i];
    
    // Lines should be format: "142-284"
    const match = spec.lines.match(/^(\d+)-(\d+)$/);
    
    if (!match) {
      throw new Error(`Invalid line range format: ${spec.lines}. Expected format: "142-284"`);
    }
    
    const startLine = parseInt(match[1], 10);
    const endLine = parseInt(match[2], 10);
    
    if (startLine < 1 || endLine < startLine) {
      throw new Error(`Invalid line range: ${spec.lines}`);
    }
    
    parsed.push({
      startLine,
      endLine,
      text: spec.text,
      originalIndex: i,
    });
  }
  
  return parsed;
}

/**
 * Validate no overlapping line ranges
 */
function validateNoOverlaps(replaces: ParsedReplace[]): void {
  const sorted = [...replaces].sort((a, b) => a.startLine - b.startLine);
  
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
  replaces: ParsedReplace[]
): Promise<void> {
  console.log(chalk.bold.cyan(`📋 Compress Preview: ${specName}`));
  console.log('');
  
  console.log(chalk.bold('Would replace:'));
  console.log('');
  
  let totalOriginalLines = 0;
  let totalNewLines = 0;
  
  for (const replace of replaces) {
    const originalLineCount = replace.endLine - replace.startLine + 1;
    const newLineCount = replace.text.split('\n').length;
    totalOriginalLines += originalLineCount;
    totalNewLines += newLineCount;
    
    // Extract original content
    const originalContent = extractLines(content, replace.startLine, replace.endLine);
    const originalPreview = originalContent.split('\n').slice(0, 3);
    
    // Preview replacement
    const newPreview = replace.text.split('\n').slice(0, 3);
    
    console.log(`  Lines ${replace.startLine}-${replace.endLine} (${originalLineCount} lines → ${newLineCount} lines)`);
    console.log(chalk.dim('    Original:'));
    for (const line of originalPreview) {
      console.log(chalk.dim(`      ${line.substring(0, 60)}${line.length > 60 ? '...' : ''}`));
    }
    if (originalContent.split('\n').length > 3) {
      console.log(chalk.dim(`      ... (${originalContent.split('\n').length - 3} more lines)`));
    }
    
    console.log(chalk.dim('    Replacement:'));
    for (const line of newPreview) {
      console.log(chalk.cyan(`      ${line.substring(0, 60)}${line.length > 60 ? '...' : ''}`));
    }
    if (replace.text.split('\n').length > 3) {
      console.log(chalk.cyan(`      ... (${replace.text.split('\n').length - 3} more lines)`));
    }
    console.log('');
  }
  
  // Calculate stats
  const originalLines = countLines(content);
  const finalLines = originalLines - totalOriginalLines + totalNewLines;
  const compression = Math.round(((totalOriginalLines - totalNewLines) / totalOriginalLines) * 100);
  
  console.log(chalk.bold('Summary:'));
  console.log(`  Original lines:  ${chalk.cyan(originalLines)}`);
  console.log(`  Replacing:       ${chalk.yellow(totalOriginalLines)} lines with ${chalk.cyan(totalNewLines)} lines`);
  console.log(`  Final lines:     ${chalk.cyan(finalLines)}`);
  console.log(`  Compression:     ${chalk.yellow(`${compression}%`)} reduction`);
  console.log('');
  
  console.log(chalk.dim('No files modified (dry run)'));
  console.log(chalk.dim('Run without --dry-run to apply changes'));
  console.log('');
}

/**
 * Execute the compression operation
 */
async function executeCompress(
  readmePath: string,
  specName: string,
  content: string,
  replaces: ParsedReplace[]
): Promise<void> {
  console.log(chalk.bold.cyan(`🗜️  Compressing: ${specName}`));
  console.log('');
  
  // Sort replaces in reverse order to maintain line numbers during replacement
  const sorted = [...replaces].sort((a, b) => b.startLine - a.startLine);
  
  // Apply each replacement
  let updatedContent = content;
  let totalOriginalLines = 0;
  let totalNewLines = 0;
  
  for (const replace of sorted) {
    const originalLineCount = replace.endLine - replace.startLine + 1;
    const newLineCount = replace.text.split('\n').length;
    
    updatedContent = replaceLines(updatedContent, replace.startLine, replace.endLine, replace.text);
    
    totalOriginalLines += originalLineCount;
    totalNewLines += newLineCount;
    
    console.log(
      chalk.green(`✓ Replaced lines ${replace.startLine}-${replace.endLine} `) +
      chalk.dim(`(${originalLineCount} lines → ${newLineCount} lines)`)
    );
  }
  
  // Write updated content
  await writeFile(readmePath, updatedContent, 'utf-8');
  
  // Calculate final stats
  const originalLines = countLines(content);
  const finalLines = countLines(updatedContent);
  const compression = Math.round(((totalOriginalLines - totalNewLines) / totalOriginalLines) * 100);
  
  console.log('');
  console.log(chalk.bold.green('Compression complete!'));
  console.log(chalk.dim(`${originalLines} → ${finalLines} lines`));
  console.log(chalk.dim(`${compression}% compression on replaced sections`));
  console.log('');
}
