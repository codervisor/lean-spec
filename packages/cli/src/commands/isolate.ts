/**
 * Isolate command - move content to new spec
 * 
 * Implements spec 059: Programmatic Spec Management
 * 
 * Mechanically moves specified content to a new spec file.
 * AI agents decide what to isolate, this tool executes move.
 * 
 * No semantic analysis - just mechanical file operations.
 */

import chalk from 'chalk';
import * as path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { 
  extractLines, 
  removeLines,
  countLines,
  parseFrontmatterFromString,
  createUpdatedFrontmatter,
  type Frontmatter,
} from '@leanspec/core';
import { loadConfig } from '../config.js';
import { resolveSpecPath } from '../utils/path-helpers.js';
import { sanitizeUserInput } from '../utils/ui.js';
import { autoCheckIfEnabled } from './check.js';

export interface IsolateOptions {
  lines: string;         // Format: "401-542"
  to: string;            // New spec name (e.g., "060-velocity-algorithm")
  addReference?: boolean; // Add cross-reference in source
  dryRun?: boolean;      // Show what would be created
  force?: boolean;       // Overwrite existing spec
}

interface ParsedLines {
  startLine: number;
  endLine: number;
}

/**
 * Isolate content to new spec
 */
export async function isolateCommand(sourceSpecPath: string, options: IsolateOptions): Promise<void> {
  await autoCheckIfEnabled();
  
  try {
    // Validate options
    if (!options.lines) {
      throw new Error('--lines option is required');
    }
    
    if (!options.to) {
      throw new Error('--to option is required (new spec name)');
    }
    
    // Resolve source spec path
    const config = await loadConfig();
    const cwd = process.cwd();
    const specsDir = path.join(cwd, config.specsDir);
    const resolvedSourcePath = await resolveSpecPath(sourceSpecPath, cwd, specsDir);
    
    if (!resolvedSourcePath) {
      throw new Error(`Source spec not found: ${sanitizeUserInput(sourceSpecPath)}`);
    }

    // Parse target spec name (ensure it has proper format)
    const targetSpecName = normalizeSpecName(options.to);
    const targetSpecPath = path.join(specsDir, targetSpecName);
    
    // Read source spec
    const sourceSpecName = path.basename(resolvedSourcePath);
    const sourceReadmePath = path.join(resolvedSourcePath, 'README.md');
    const sourceContent = await readFile(sourceReadmePath, 'utf-8');
    
    // Parse line range
    const lineRange = parseLineRange(options.lines);
    
    // Validate line range
    const totalLines = countLines(sourceContent);
    if (lineRange.startLine < 1 || lineRange.endLine > totalLines) {
      throw new Error(`Line range ${options.lines} is out of bounds (spec has ${totalLines} lines)`);
    }
    
    // Extract content to move
    const extractedContent = extractLines(sourceContent, lineRange.startLine, lineRange.endLine);
    const extractedLines = countLines(extractedContent);
    
    // Dry run mode
    if (options.dryRun) {
      await displayDryRun(sourceSpecName, targetSpecName, lineRange, extractedContent);
      return;
    }
    
    // Execute isolation
    await executeIsolate(
      resolvedSourcePath,
      sourceSpecName,
      sourceReadmePath,
      sourceContent,
      targetSpecPath,
      targetSpecName,
      lineRange,
      extractedContent,
      extractedLines,
      options
    );
    
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
    throw error;
  }
}

/**
 * Normalize spec name to ensure proper format
 */
function normalizeSpecName(name: string): string {
  // If it already looks like a spec name (###-name), use as is
  if (/^\d{3,}-/.test(name)) {
    return name;
  }
  
  // Otherwise, treat it as just a name part
  // For now, just return it - the user should provide the full name
  // In the future, we could auto-generate the next number
  return name;
}

/**
 * Parse line range from string
 */
function parseLineRange(lines: string): ParsedLines {
  const match = lines.match(/^(\d+)-(\d+)$/);
  
  if (!match) {
    throw new Error(`Invalid line range format: ${lines}. Expected format: "401-542"`);
  }
  
  const startLine = parseInt(match[1], 10);
  const endLine = parseInt(match[2], 10);
  
  if (startLine < 1 || endLine < startLine) {
    throw new Error(`Invalid line range: ${lines}`);
  }
  
  return { startLine, endLine };
}

/**
 * Display dry-run output
 */
async function displayDryRun(
  sourceSpecName: string,
  targetSpecName: string,
  lineRange: ParsedLines,
  extractedContent: string
): Promise<void> {
  console.log(chalk.bold.cyan(`📋 Isolate Preview`));
  console.log('');
  
  console.log(chalk.bold('Would create:'));
  console.log(`  ${chalk.cyan(targetSpecName)}/README.md`);
  console.log(`    Lines: ${countLines(extractedContent)}`);
  
  // Show preview
  const previewLines = extractedContent.split('\n').slice(0, 5);
  console.log(chalk.dim('    Preview:'));
  for (const line of previewLines) {
    console.log(chalk.dim(`      ${line.substring(0, 60)}${line.length > 60 ? '...' : ''}`));
  }
  if (extractedContent.split('\n').length > 5) {
    console.log(chalk.dim(`      ... (${extractedContent.split('\n').length - 5} more lines)`));
  }
  console.log('');
  
  console.log(chalk.bold('Would remove from source:'));
  console.log(`  ${chalk.yellow(sourceSpecName)}`);
  console.log(`    Lines ${lineRange.startLine}-${lineRange.endLine} (${lineRange.endLine - lineRange.startLine + 1} lines)`);
  console.log('');
  
  console.log(chalk.dim('No files modified (dry run)'));
  console.log(chalk.dim('Run without --dry-run to apply changes'));
  console.log('');
}

/**
 * Execute the isolation operation
 */
async function executeIsolate(
  sourceSpecPath: string,
  sourceSpecName: string,
  sourceReadmePath: string,
  sourceContent: string,
  targetSpecPath: string,
  targetSpecName: string,
  lineRange: ParsedLines,
  extractedContent: string,
  extractedLines: number,
  options: IsolateOptions
): Promise<void> {
  console.log(chalk.bold.cyan(`✂️  Isolating content to new spec`));
  console.log('');
  
  // 1. Create target spec directory
  await mkdir(targetSpecPath, { recursive: true });
  console.log(chalk.green(`✓ Created directory: ${targetSpecName}`));
  
  // 2. Parse frontmatter from source
  const sourceFrontmatter = parseFrontmatterFromString(sourceContent);
  
  // 3. Create new spec with extracted content
  const targetFrontmatter: Frontmatter = {
    status: 'planned',
    created: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    priority: sourceFrontmatter?.priority || 'medium',
    tags: sourceFrontmatter?.tags || [],
    created_at: new Date().toISOString(),
  };
  
  // Build target spec content with frontmatter
  const { content: targetContent } = createUpdatedFrontmatter(
    extractedContent,
    targetFrontmatter
  );
  
  const targetReadmePath = path.join(targetSpecPath, 'README.md');
  await writeFile(targetReadmePath, targetContent, 'utf-8');
  console.log(chalk.green(`✓ Created ${targetSpecName}/README.md (${extractedLines} lines)`));
  
  // 4. Remove content from source spec
  const updatedSourceContent = removeLines(sourceContent, lineRange.startLine, lineRange.endLine);
  
  // 5. Add cross-reference if requested
  let finalSourceContent = updatedSourceContent;
  if (options.addReference) {
    finalSourceContent = addCrossReference(
      updatedSourceContent,
      targetSpecName,
      lineRange.startLine
    );
    console.log(chalk.green(`✓ Added cross-reference to ${targetSpecName}`));
  }
  
  await writeFile(sourceReadmePath, finalSourceContent, 'utf-8');
  console.log(chalk.green(`✓ Removed lines ${lineRange.startLine}-${lineRange.endLine} from ${sourceSpecName}`));
  
  // 6. Update frontmatter relationships if source has frontmatter
  if (sourceFrontmatter && options.addReference) {
    // Add to related specs
    const updatedSourceFrontmatter: Frontmatter = {
      ...sourceFrontmatter,
      related: [...(sourceFrontmatter.related || []), targetSpecName],
    };
    
    const { content: finalSourceWithFrontmatter } = createUpdatedFrontmatter(
      finalSourceContent,
      updatedSourceFrontmatter
    );
    
    await writeFile(sourceReadmePath, finalSourceWithFrontmatter, 'utf-8');
    console.log(chalk.green(`✓ Updated frontmatter (related field)`));
  }
  
  console.log('');
  console.log(chalk.bold.green('Isolation complete!'));
  console.log(chalk.dim(`Created new spec: ${targetSpecName}`));
  console.log(chalk.dim(`Removed ${lineRange.endLine - lineRange.startLine + 1} lines from source`));
  console.log('');
}

/**
 * Add cross-reference to isolated spec
 */
function addCrossReference(content: string, targetSpecName: string, insertAtLine: number): string {
  const lines = content.split('\n');
  
  // Build reference text
  const reference = [
    '',
    `> **Note**: This section was moved to [${targetSpecName}](../${targetSpecName}/)`,
    '',
  ];
  
  // Insert at the position where content was removed (adjust for 0-indexing)
  lines.splice(insertAtLine - 1, 0, ...reference);
  
  return lines.join('\n');
}
