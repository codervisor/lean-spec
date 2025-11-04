import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';
import { loadConfig } from '../config.js';
import { resolveSpecPath } from '../utils/path-helpers.js';
import { autoCheckIfEnabled } from './check.js';
import { sanitizeUserInput } from '../utils/ui.js';

export async function archiveSpec(specPath: string): Promise<void> {
  // Auto-check for conflicts before archive
  await autoCheckIfEnabled();
  
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);
  
  // Resolve the spec path using the helper
  const resolvedPath = await resolveSpecPath(specPath, cwd, specsDir);
  
  if (!resolvedPath) {
    throw new Error(`Spec not found: ${sanitizeUserInput(specPath)}`);
  }

  // Archive to flat structure in specs/archived/ regardless of original pattern
  const archiveDir = path.join(specsDir, 'archived');
  await fs.mkdir(archiveDir, { recursive: true });

  const specName = path.basename(resolvedPath);
  const archivePath = path.join(archiveDir, specName);

  await fs.rename(resolvedPath, archivePath);

  console.log(chalk.green(`✓ Archived: ${sanitizeUserInput(archivePath)}`));
}
