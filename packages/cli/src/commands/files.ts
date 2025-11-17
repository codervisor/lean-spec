import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { getSpec, loadSubFiles } from '../spec-loader.js';
import { resolveSpecPath } from '../utils/path-helpers.js';
import { loadConfig } from '../config.js';
import { autoCheckIfEnabled } from './check.js';
import { sanitizeUserInput } from '../utils/ui.js';
import { countTokens } from '@leanspec/core';

export interface FilesOptions {
  type?: 'docs' | 'assets';
  tree?: boolean;
}

export function filesCommand(): Command;
export function filesCommand(specPath: string, options?: FilesOptions): Promise<void>;
export function filesCommand(specPath?: string, options: FilesOptions = {}): Command | Promise<void> {
  if (typeof specPath === 'string') {
    return showFiles(specPath, options);
  }

  return new Command('files')
    .description('List files in a spec')
    .argument('<spec>', 'Spec to list files for')
    .option('--type <type>', 'Filter by type: docs, assets')
    .option('--tree', 'Show tree structure')
    .action(async (target: string, opts: FilesOptions) => {
      await showFiles(target, opts);
    });
}

export async function showFiles(
  specPath: string,
  options: FilesOptions = {}
): Promise<void> {
  // Auto-check for conflicts before display
  await autoCheckIfEnabled();
  
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);

  // Resolve spec path
  const resolvedPath = await resolveSpecPath(specPath, cwd, specsDir);
  if (!resolvedPath) {
    throw new Error(`Spec not found: ${sanitizeUserInput(specPath)}. Try using the full path or spec name (e.g., 001-my-spec)`);
  }

  // Load spec info
  const spec = await getSpec(resolvedPath);
  if (!spec) {
    throw new Error(`Could not load spec: ${sanitizeUserInput(specPath)}`);
  }

  // Load sub-files
  const subFiles = await loadSubFiles(spec.fullPath);

  console.log('');
  console.log(chalk.cyan(`📄 Files in ${sanitizeUserInput(spec.name)}`));
  console.log('');

  // Show README.md (required)
  console.log(chalk.green('Required:'));
  const readmeStat = await fs.stat(spec.filePath);
  const readmeSize = formatSize(readmeStat.size);
  const readmeContent = await fs.readFile(spec.filePath, 'utf-8');
  const readmeTokens = await countTokens({ content: readmeContent });
  console.log(chalk.green(`  ✓ README.md              (${readmeSize}, ~${readmeTokens.total.toLocaleString()} tokens)  Main spec`));
  console.log('');

  // Filter by type if requested
  let filteredFiles = subFiles;
  if (options.type === 'docs') {
    filteredFiles = subFiles.filter((f) => f.type === 'document');
  } else if (options.type === 'assets') {
    filteredFiles = subFiles.filter((f) => f.type === 'asset');
  }

  if (filteredFiles.length === 0) {
    console.log(chalk.gray('No additional files'));
    console.log('');
    return;
  }

  // Group by type
  const documents = filteredFiles.filter((f) => f.type === 'document');
  const assets = filteredFiles.filter((f) => f.type === 'asset');

  if (documents.length > 0 && (!options.type || options.type === 'docs')) {
    console.log(chalk.cyan('Documents:'));
    for (const file of documents) {
      const size = formatSize(file.size);
      // Count tokens for document files
      const content = await fs.readFile(file.path, 'utf-8');
      const tokenCount = await countTokens({ content });
      console.log(chalk.cyan(`  ✓ ${sanitizeUserInput(file.name).padEnd(20)} (${size}, ~${tokenCount.total.toLocaleString()} tokens)`));
    }
    console.log('');
  }

  if (assets.length > 0 && (!options.type || options.type === 'assets')) {
    console.log(chalk.yellow('Assets:'));
    for (const file of assets) {
      const size = formatSize(file.size);
      console.log(chalk.yellow(`  ✓ ${sanitizeUserInput(file.name).padEnd(20)} (${size})`));
    }
    console.log('');
  }

  // Show totals
  const totalFiles = filteredFiles.length + 1; // +1 for README.md
  const totalSize = formatSize(
    readmeStat.size + filteredFiles.reduce((sum, f) => sum + f.size, 0)
  );
  console.log(chalk.gray(`Total: ${totalFiles} files, ${totalSize}`));
  console.log('');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
