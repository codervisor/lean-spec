import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';
import { loadConfig } from '../config.js';

export async function archiveSpec(specPath: string): Promise<void> {
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);
  
  const resolvedPath = path.resolve(specPath);

  // Check if directory exists
  try {
    await fs.access(resolvedPath);
  } catch {
    console.error(chalk.red(`Error: Spec not found: ${specPath}`));
    process.exit(1);
  }

  // Get parent directory (date folder)
  const parentDir = path.dirname(resolvedPath);
  const dateFolder = path.basename(parentDir);
  const archiveDir = path.join(specsDir, 'archived', dateFolder);

  await fs.mkdir(archiveDir, { recursive: true });

  const specName = path.basename(resolvedPath);
  const archivePath = path.join(archiveDir, specName);

  await fs.rename(resolvedPath, archivePath);

  console.log(chalk.green(`✓ Archived: ${archivePath}`));
}
