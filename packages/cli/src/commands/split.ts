/**
 * Split command - partition spec into sub-spec files
 * 
 * Implements spec 059: Programmatic Spec Management
 * 
 * Mechanically splits spec based on explicit line ranges.
 * AI agents decide what goes where, this tool executes.
 * 
 * No semantic analysis - just mechanical file operations.
 */

import chalk from 'chalk';
import * as path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { 
  extractLines, 
  countLines,
  parseFrontmatterFromString,
  createUpdatedFrontmatter,
} from '@leanspec/core';
import { loadConfig } from '../config.js';
import { resolveSpecPath } from '../utils/path-helpers.js';
import { sanitizeUserInput } from '../utils/ui.js';
import { autoCheckIfEnabled } from './check.js';

export interface SplitOptions {
  outputs: Array<{
    file: string;
    lines: string; // Format: "1-150" or "151-528"
  }>;
  updateRefs?: boolean;   // Update cross-references in README
  dryRun?: boolean;      // Show what would be created
  force?: boolean;       // Overwrite existing files
}

interface ParsedOutput {
  file: string;
  startLine: number;
  endLine: number;
}

/**
 * Split spec into multiple files
 */
export async function splitCommand(specPath: string, options: SplitOptions): Promise<void> {
  await autoCheckIfEnabled();
  
  try {
    // Validate options
    if (!options.outputs || options.outputs.length === 0) {
      throw new Error('At least one --output option is required');
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
    
    // Parse output specifications
    const parsedOutputs = parseOutputSpecs(options.outputs);
    
    // Validate no overlapping ranges
    validateNoOverlaps(parsedOutputs);
    
    // Extract content for each output
    const extractions: Array<{
      file: string;
      content: string;
      tokens: number;
      lines: number;
    }> = [];
    
    for (const output of parsedOutputs) {
      const extracted = extractLines(content, output.startLine, output.endLine);
      const lineCount = countLines(extracted);
      
      extractions.push({
        file: output.file,
        content: extracted,
        tokens: 0, // Will be calculated in dry-run or actual execution
        lines: lineCount,
      });
    }
    
    // Dry run mode
    if (options.dryRun) {
      await displayDryRun(specName, extractions);
      return;
    }
    
    // Execute split
    await executeSplit(resolvedPath, specName, content, extractions, options);
    
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
    throw error;
  }
}

/**
 * Parse output specifications from command line
 */
function parseOutputSpecs(outputs: SplitOptions['outputs']): ParsedOutput[] {
  const parsed: ParsedOutput[] = [];
  
  for (const output of outputs) {
    // Format: "file.md:1-150" or "file.md:151-528"
    const match = output.lines.match(/^(\d+)-(\d+)$/);
    
    if (!match) {
      throw new Error(`Invalid line range format: ${output.lines}. Expected format: "1-150"`);
    }
    
    const startLine = parseInt(match[1], 10);
    const endLine = parseInt(match[2], 10);
    
    if (startLine < 1 || endLine < startLine) {
      throw new Error(`Invalid line range: ${output.lines}`);
    }
    
    parsed.push({
      file: output.file,
      startLine,
      endLine,
    });
  }
  
  return parsed;
}

/**
 * Validate no overlapping line ranges
 */
function validateNoOverlaps(outputs: ParsedOutput[]): void {
  const sorted = [...outputs].sort((a, b) => a.startLine - b.startLine);
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    
    if (current.endLine >= next.startLine) {
      throw new Error(
        `Overlapping line ranges: ${current.file} (${current.startLine}-${current.endLine}) ` +
        `overlaps with ${next.file} (${next.startLine}-${next.endLine})`
      );
    }
  }
}

/**
 * Display dry-run output
 */
async function displayDryRun(
  specName: string,
  extractions: Array<{ file: string; content: string; lines: number }>
): Promise<void> {
  console.log(chalk.bold.cyan(`📋 Split Preview: ${specName}`));
  console.log('');
  
  console.log(chalk.bold('Would create:'));
  console.log('');
  
  for (const ext of extractions) {
    console.log(`  ${chalk.cyan(ext.file)}`);
    console.log(`    Lines: ${ext.lines}`);
    
    // Show first few lines as preview
    const previewLines = ext.content.split('\n').slice(0, 3);
    console.log(chalk.dim('    Preview:'));
    for (const line of previewLines) {
      console.log(chalk.dim(`      ${line.substring(0, 60)}${line.length > 60 ? '...' : ''}`));
    }
    console.log('');
  }
  
  console.log(chalk.dim('No files modified (dry run)'));
  console.log(chalk.dim('Run without --dry-run to apply changes'));
  console.log('');
}

/**
 * Execute the split operation
 */
async function executeSplit(
  specPath: string,
  specName: string,
  originalContent: string,
  extractions: Array<{ file: string; content: string; lines: number }>,
  options: SplitOptions
): Promise<void> {
  console.log(chalk.bold.cyan(`✂️  Splitting: ${specName}`));
  console.log('');
  
  // Parse frontmatter from original
  const frontmatter = parseFrontmatterFromString(originalContent);
  
  // Create each output file
  for (const ext of extractions) {
    const outputPath = path.join(specPath, ext.file);
    
    // For README.md, include frontmatter
    let finalContent = ext.content;
    if (ext.file === 'README.md' && frontmatter) {
      // Rebuild with frontmatter
      const { content: contentWithFrontmatter } = createUpdatedFrontmatter(
        ext.content,
        frontmatter
      );
      finalContent = contentWithFrontmatter;
    }
    
    await writeFile(outputPath, finalContent, 'utf-8');
    
    console.log(chalk.green(`✓ Created ${ext.file} (${ext.lines} lines)`));
  }
  
  // Update README.md to add sub-spec links if requested
  if (options.updateRefs) {
    const readmePath = path.join(specPath, 'README.md');
    const readmeContent = await readFile(readmePath, 'utf-8');
    
    // Add sub-specs section if it doesn't exist
    const updatedReadme = await addSubSpecLinks(
      readmeContent,
      extractions.map(e => e.file).filter(f => f !== 'README.md')
    );
    
    await writeFile(readmePath, updatedReadme, 'utf-8');
    console.log(chalk.green(`✓ Updated README.md with sub-spec links`));
  }
  
  console.log('');
  console.log(chalk.bold.green('Split complete!'));
  console.log(chalk.dim(`Created ${extractions.length} files in ${specName}`));
  console.log('');
}

/**
 * Add sub-spec links to README
 */
async function addSubSpecLinks(content: string, subSpecs: string[]): Promise<string> {
  if (subSpecs.length === 0) {
    return content;
  }
  
  // Check if sub-specs section already exists
  if (content.includes('## Sub-Specs') || content.includes('## Sub-specs')) {
    // Section exists, don't modify
    return content;
  }
  
  // Find a good place to insert (after overview/decision, before implementation)
  const lines = content.split('\n');
  let insertIndex = -1;
  
  // Look for common section markers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('## implementation') || 
        line.includes('## plan') || 
        line.includes('## test')) {
      insertIndex = i;
      break;
    }
  }
  
  // If no good spot found, add at end
  if (insertIndex === -1) {
    insertIndex = lines.length;
  }
  
  // Build sub-specs section
  const subSpecsSection = [
    '',
    '## Sub-Specs',
    '',
    'This spec is organized using sub-spec files:',
    '',
    ...subSpecs.map(file => {
      const name = file.replace('.md', '');
      return `- **[${name}](./${file})** - ${getFileDescription(file)}`;
    }),
    '',
  ];
  
  // Insert section
  lines.splice(insertIndex, 0, ...subSpecsSection);
  
  return lines.join('\n');
}

/**
 * Get description for common sub-spec files
 */
function getFileDescription(file: string): string {
  const lower = file.toLowerCase();
  
  if (lower.includes('design')) return 'Architecture and design details';
  if (lower.includes('implementation')) return 'Implementation plan and phases';
  if (lower.includes('testing') || lower.includes('test')) return 'Test strategy and cases';
  if (lower.includes('rationale')) return 'Design rationale and decisions';
  if (lower.includes('api')) return 'API specification';
  if (lower.includes('migration')) return 'Migration plan and strategy';
  if (lower.includes('context')) return 'Context and research';
  
  return 'Additional documentation';
}
