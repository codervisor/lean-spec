import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Environment variables for customization
const SPECS_DIR = process.env.SPECS_DIR || path.join(process.cwd(), 'specs');
const TEMPLATE_PATH =
  process.env.TEMPLATE_PATH || path.join(__dirname, '..', 'templates', 'spec.md');

// Get today's date in YYYYMMDD format
function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Get next sequence number for a date directory
async function getNextSeq(dateDir: string): Promise<string> {
  try {
    const files = await fs.readdir(dateDir);
    const seqNumbers = files
      .filter((f) => /^\d{3}-.+\.md$/.test(f))
      .map((f) => parseInt(f.substring(0, 3), 10))
      .filter((n) => !isNaN(n));

    if (seqNumbers.length === 0) {
      return '001';
    }

    const maxSeq = Math.max(...seqNumbers);
    return String(maxSeq + 1).padStart(3, '0');
  } catch {
    return '001';
  }
}

export async function createSpec(name: string): Promise<void> {
  const today = getToday();
  const dateDir = path.join(SPECS_DIR, today);

  await fs.mkdir(dateDir, { recursive: true });

  const seq = await getNextSeq(dateDir);
  const specFile = path.join(dateDir, `${seq}-${name}.md`);

  // Check if file exists
  try {
    await fs.access(specFile);
    console.log(chalk.yellow(`Warning: File exists: ${specFile}`));
    process.exit(1);
  } catch {
    // File doesn't exist, continue
  }

  // Read template
  let template: string;
  try {
    template = await fs.readFile(TEMPLATE_PATH, 'utf-8');
  } catch {
    console.error(chalk.red(`Error: Template not found: ${TEMPLATE_PATH}`));
    process.exit(1);
  }

  // Replace placeholders
  const currentDate = new Date().toISOString().split('T')[0];
  const content = template.replace(/\[DATE\]/g, currentDate).replace(/\[NAME\]/g, name);

  await fs.writeFile(specFile, content, 'utf-8');

  console.log(chalk.green(`✓ Created: ${specFile}`));
}

export async function archiveSpec(specPath: string): Promise<void> {
  const resolvedPath = path.resolve(specPath);

  // Check if file exists
  try {
    await fs.access(resolvedPath);
  } catch {
    console.error(chalk.red(`Error: File not found: ${specPath}`));
    process.exit(1);
  }

  const specDir = path.dirname(resolvedPath);
  const dateFolder = path.basename(specDir);
  const archiveDir = path.join(SPECS_DIR, 'archived', dateFolder);

  await fs.mkdir(archiveDir, { recursive: true });

  const fileName = path.basename(resolvedPath);
  const archivePath = path.join(archiveDir, fileName);

  await fs.rename(resolvedPath, archivePath);

  console.log(chalk.green(`✓ Archived: ${archivePath}`));
}

export async function listSpecs(showArchived: boolean): Promise<void> {
  console.log('');
  console.log(chalk.green('=== Specs ==='));
  console.log('');

  try {
    await fs.access(SPECS_DIR);
  } catch {
    console.log('No specs directory found. Create one with: lspec create <name>');
    console.log('');
    return;
  }

  // List active specs
  const entries = await fs.readdir(SPECS_DIR, { withFileTypes: true });
  const dateDirs = entries
    .filter((e) => e.isDirectory() && /^\d{8}$/.test(e.name) && e.name !== 'archived')
    .sort((a, b) => b.name.localeCompare(a.name)); // Reverse chronological

  let foundActive = false;
  for (const dir of dateDirs) {
    const dateDir = path.join(SPECS_DIR, dir.name);
    const specs = await fs.readdir(dateDir);
    const specFiles = specs.filter((f) => /^\d{3}-.+\.md$/.test(f)).sort();

    if (specFiles.length > 0) {
      foundActive = true;
      console.log(chalk.cyan(`${dir.name}/`));
      for (const spec of specFiles) {
        console.log(`  ${spec}`);
      }
      console.log('');
    }
  }

  if (!foundActive) {
    console.log('No active specs found');
  }

  // List archived specs
  if (showArchived) {
    const archivedPath = path.join(SPECS_DIR, 'archived');
    try {
      await fs.access(archivedPath);
      console.log(chalk.yellow('=== Archived ==='));
      console.log('');

      const archivedEntries = await fs.readdir(archivedPath, { withFileTypes: true });
      const archivedDirs = archivedEntries
        .filter((e) => e.isDirectory() && /^\d{8}$/.test(e.name))
        .sort((a, b) => b.name.localeCompare(a.name));

      for (const dir of archivedDirs) {
        const dateDir = path.join(archivedPath, dir.name);
        const specs = await fs.readdir(dateDir);
        const specFiles = specs.filter((f) => /^\d{3}-.+\.md$/.test(f)).sort();

        if (specFiles.length > 0) {
          console.log(chalk.cyan(`${dir.name}/`));
          for (const spec of specFiles) {
            console.log(`  ${spec}`);
          }
          console.log('');
        }
      }
    } catch {
      // No archived directory
    }
  }

  console.log('');
}
