import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { select } from '@inquirer/prompts';
import { loadConfig, saveConfig, getToday, type LeanSpecConfig } from './config.js';
import { 
  parseFrontmatter, 
  matchesFilter, 
  getSpecFile,
  updateFrontmatter,
  type SpecFilterOptions,
  type SpecStatus,
  type SpecPriority
} from './frontmatter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

// Get next sequence number for a date directory
async function getNextSeq(dateDir: string, digits: number): Promise<string> {
  try {
    const entries = await fs.readdir(dateDir, { withFileTypes: true });
    const seqNumbers = entries
      .filter((e) => e.isDirectory() && /^\d{2,3}-.+/.test(e.name))
      .map((e) => parseInt(e.name.split('-')[0], 10))
      .filter((n) => !isNaN(n));

    if (seqNumbers.length === 0) {
      return '1'.padStart(digits, '0');
    }

    const maxSeq = Math.max(...seqNumbers);
    return String(maxSeq + 1).padStart(digits, '0');
  } catch {
    return '1'.padStart(digits, '0');
  }
}

export async function createSpec(name: string, options: { title?: string; description?: string } = {}): Promise<void> {
  const config = await loadConfig();
  const cwd = process.cwd();
  
  const today = getToday(config.structure.dateFormat);
  const specsDir = path.join(cwd, config.specsDir);
  const dateDir = path.join(specsDir, today);

  await fs.mkdir(dateDir, { recursive: true });

  const seq = await getNextSeq(dateDir, config.structure.sequenceDigits);
  const specDir = path.join(dateDir, `${seq}-${name}`);
  const specFile = path.join(specDir, config.structure.defaultFile);

  // Check if directory exists
  try {
    await fs.access(specDir);
    console.log(chalk.yellow(`Warning: Spec already exists: ${specDir}`));
    process.exit(1);
  } catch {
    // Directory doesn't exist, continue
  }

  // Create spec directory
  await fs.mkdir(specDir, { recursive: true });

  // Load spec template from configured template
  const templatePath = path.join(TEMPLATES_DIR, config.template, 'spec-template.md');
  let content: string;
  
  try {
    const template = await fs.readFile(templatePath, 'utf-8');
    const date = new Date().toISOString().split('T')[0];
    const title = options.title || name;
    
    content = template
      .replace(/{name}/g, title)
      .replace(/{date}/g, date);
    
    // Add description to Overview section if provided
    if (options.description) {
      content = content.replace(
        /## Overview\s+<!-- What are we solving\? Why now\? -->/,
        `## Overview\n\n${options.description}`
      );
    }
  } catch {
    // Fallback to basic template if template file not found
    const title = options.title || name;
    const overview = options.description || '<!-- What problem does this solve? Why now? -->';
    
    content = `# ${title}

**Status**: 📅 Planned  
**Created**: ${new Date().toISOString().split('T')[0]}

## Goal

${overview}

## Key Points

- 
- 
- 

## Non-Goals

- 
- 

## Notes

<!-- Decisions, constraints, open questions -->
`;
  }

  await fs.writeFile(specFile, content, 'utf-8');

  console.log(chalk.green(`✓ Created: ${specDir}/`));
  console.log(chalk.gray(`  Edit: ${specFile}`));
}

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

export async function listSpecs(options: {
  showArchived?: boolean;
  status?: SpecStatus | SpecStatus[];
  tags?: string[];
  priority?: SpecPriority | SpecPriority[];
  assignee?: string;
} = {}): Promise<void> {
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);
  
  console.log('');
  console.log(chalk.green('=== Specs ==='));
  console.log('');

  try {
    await fs.access(specsDir);
  } catch {
    console.log('No specs directory found. Initialize with: lspec init');
    console.log('');
    return;
  }

  // Build filter options
  const filter: SpecFilterOptions = {};
  if (options.status) filter.status = options.status;
  if (options.tags) filter.tags = options.tags;
  if (options.priority) filter.priority = options.priority;
  if (options.assignee) filter.assignee = options.assignee;

  const hasFilters = Object.keys(filter).length > 0;

  // List active specs
  const entries = await fs.readdir(specsDir, { withFileTypes: true });
  const dateDirs = entries
    .filter((e) => e.isDirectory() && e.name !== 'archived')
    .sort((a, b) => b.name.localeCompare(a.name)); // Reverse chronological

  let foundActive = false;
  for (const dir of dateDirs) {
    const dateDir = path.join(specsDir, dir.name);
    const specs = await fs.readdir(dateDir, { withFileTypes: true });
    const specDirs = specs.filter((s) => s.isDirectory()).sort();

    const filteredSpecs = [];
    
    for (const spec of specDirs) {
      const specDir = path.join(dateDir, spec.name);
      const specFile = await getSpecFile(specDir, config.structure.defaultFile);
      
      if (!specFile) continue;

      // Parse frontmatter if filtering is requested
      if (hasFilters) {
        const frontmatter = await parseFrontmatter(specFile);
        if (!frontmatter || !matchesFilter(frontmatter, filter)) {
          continue;
        }
        filteredSpecs.push({ name: spec.name, frontmatter });
      } else {
        // No filters, just show all
        const frontmatter = await parseFrontmatter(specFile);
        filteredSpecs.push({ name: spec.name, frontmatter });
      }
    }

    if (filteredSpecs.length > 0) {
      foundActive = true;
      console.log(chalk.cyan(`${dir.name}/`));
      for (const spec of filteredSpecs) {
        let line = `  ${spec.name}/`;
        
        // Add metadata if available
        if (spec.frontmatter) {
          const meta: string[] = [];
          meta.push(getStatusEmoji(spec.frontmatter.status));
          if (spec.frontmatter.priority) {
            meta.push(getPriorityLabel(spec.frontmatter.priority));
          }
          if (spec.frontmatter.tags && spec.frontmatter.tags.length > 0) {
            meta.push(chalk.gray(`[${spec.frontmatter.tags.join(', ')}]`));
          }
          
          if (meta.length > 0) {
            line += ` ${meta.join(' ')}`;
          }
        }
        
        console.log(line);
      }
      console.log('');
    }
  }

  if (!foundActive) {
    if (hasFilters) {
      console.log('No specs match the specified filters.');
    } else {
      console.log('No active specs found. Create one with: lspec create <name>');
    }
  }

  // List archived specs
  if (options.showArchived) {
    const archivedPath = path.join(specsDir, 'archived');
    try {
      await fs.access(archivedPath);
      console.log(chalk.yellow('=== Archived ==='));
      console.log('');

      const archivedEntries = await fs.readdir(archivedPath, { withFileTypes: true });
      const archivedDirs = archivedEntries
        .filter((e) => e.isDirectory())
        .sort((a, b) => b.name.localeCompare(a.name));

      for (const dir of archivedDirs) {
        const dateDir = path.join(archivedPath, dir.name);
        const specs = await fs.readdir(dateDir, { withFileTypes: true });
        const specDirs = specs.filter((s) => s.isDirectory()).sort();

        if (specDirs.length > 0) {
          console.log(chalk.cyan(`${dir.name}/`));
          for (const spec of specDirs) {
            console.log(`  ${spec.name}/`);
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

export async function updateSpec(
  specPath: string,
  updates: {
    status?: SpecStatus;
    priority?: SpecPriority;
    tags?: string[];
    assignee?: string;
  }
): Promise<void> {
  const config = await loadConfig();
  const cwd = process.cwd();
  
  const resolvedPath = path.resolve(specPath);

  // Check if directory exists
  try {
    await fs.access(resolvedPath);
  } catch {
    console.error(chalk.red(`Error: Spec not found: ${specPath}`));
    process.exit(1);
  }

  // Get spec file
  const specFile = await getSpecFile(resolvedPath, config.structure.defaultFile);
  if (!specFile) {
    console.error(chalk.red(`Error: No spec file found in: ${specPath}`));
    process.exit(1);
  }

  // Update frontmatter
  await updateFrontmatter(specFile, updates);

  console.log(chalk.green(`✓ Updated: ${specPath}`));
  
  // Show what was updated
  const updatedFields = Object.keys(updates).join(', ');
  console.log(chalk.gray(`  Fields: ${updatedFields}`));
}

// Helper functions for display
function getStatusEmoji(status: SpecStatus): string {
  switch (status) {
    case 'planned': return chalk.gray('📅');
    case 'in-progress': return chalk.yellow('🔨');
    case 'complete': return chalk.green('✅');
    case 'archived': return chalk.gray('📦');
    default: return '';
  }
}

function getPriorityLabel(priority: SpecPriority): string {
  switch (priority) {
    case 'low': return chalk.gray('low');
    case 'medium': return chalk.blue('med');
    case 'high': return chalk.yellow('high');
    case 'critical': return chalk.red('CRIT');
    default: return '';
  }
}

// Detect common system prompt files
async function detectExistingSystemPrompts(cwd: string): Promise<string[]> {
  const commonFiles = [
    'AGENTS.md',
    '.cursorrules',
    '.github/copilot-instructions.md',
  ];

  const found: string[] = [];
  for (const file of commonFiles) {
    try {
      await fs.access(path.join(cwd, file));
      found.push(file);
    } catch {
      // File doesn't exist
    }
  }
  return found;
}

// Handle existing system prompt files
async function handleExistingFiles(
  action: 'merge' | 'backup' | 'skip',
  existingFiles: string[],
  templateDir: string,
  cwd: string,
  variables: Record<string, string> = {}
): Promise<void> {
  for (const file of existingFiles) {
    const filePath = path.join(cwd, file);
    const templateFilePath = path.join(templateDir, 'files', file);

    // Check if template has this file
    try {
      await fs.access(templateFilePath);
    } catch {
      // Template doesn't have this file, skip
      continue;
    }

    if (action === 'merge' && file === 'AGENTS.md') {
      // Append LeanSpec section to existing AGENTS.md
      const existing = await fs.readFile(filePath, 'utf-8');
      let template = await fs.readFile(templateFilePath, 'utf-8');
      
      // Replace variables in template
      for (const [key, value] of Object.entries(variables)) {
        template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }

      const merged = `${existing}

---

## LeanSpec Integration

${template.split('\n').slice(1).join('\n')}`;

      await fs.writeFile(filePath, merged, 'utf-8');
      console.log(chalk.green(`✓ Merged LeanSpec section into ${file}`));
    } else if (action === 'backup') {
      // Backup existing file
      const backupPath = `${filePath}.backup`;
      await fs.rename(filePath, backupPath);
      console.log(chalk.yellow(`✓ Backed up ${file} → ${file}.backup`));

      // Copy template file with variable substitution
      let content = await fs.readFile(templateFilePath, 'utf-8');
      
      // Replace variables in content
      for (const [key, value] of Object.entries(variables)) {
        content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
      
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(chalk.green(`✓ Created new ${file}`));
    }
    // If skip, do nothing with this file
  }
}

export async function initProject(): Promise<void> {
  const cwd = process.cwd();

  // Check if already initialized
  try {
    await fs.access(path.join(cwd, '.lspec', 'config.json'));
    console.log(chalk.yellow('LeanSpec already initialized in this directory.'));
    console.log(chalk.gray('To reinitialize, delete .lspec/ directory first.'));
    return;
  } catch {
    // Not initialized, continue
  }

  console.log('');
  console.log(chalk.green('Welcome to LeanSpec!'));
  console.log('');

  // Main question: How to set up?
  const setupMode = await select({
    message: 'How would you like to set up?',
    choices: [
      {
        name: 'Quick start (recommended)',
        value: 'quick',
        description: 'Use standard template, start immediately',
      },
      {
        name: 'Choose template',
        value: 'template',
        description: 'Pick from: minimal, standard, enterprise',
      },
      {
        name: 'Customize everything',
        value: 'custom',
        description: 'Full control over structure and settings',
      },
    ],
  });

  let templateName = 'standard';

  if (setupMode === 'template') {
    // Let user choose template
    templateName = await select({
      message: 'Select template:',
      choices: [
        { name: 'minimal', value: 'minimal', description: 'Just folder structure, no extras' },
        { name: 'standard', value: 'standard', description: 'Recommended - includes AGENTS.md' },
        {
          name: 'enterprise',
          value: 'enterprise',
          description: 'Governance with approvals and compliance',
        },
      ],
    });
  } else if (setupMode === 'custom') {
    // TODO: Implement full customization flow
    console.log(chalk.yellow('Full customization coming soon. Using standard for now.'));
  }

  // Load template config
  const templateDir = path.join(TEMPLATES_DIR, templateName);
  const templateConfigPath = path.join(templateDir, 'config.json');

  let templateConfig: LeanSpecConfig;
  try {
    const content = await fs.readFile(templateConfigPath, 'utf-8');
    templateConfig = JSON.parse(content).config;
  } catch {
    console.error(chalk.red(`Error: Template not found: ${templateName}`));
    process.exit(1);
  }

  // Save config
  await saveConfig(templateConfig, cwd);
  console.log(chalk.green('✓ Created .lspec/config.json'));

  // Check for existing system prompt files
  const existingFiles = await detectExistingSystemPrompts(cwd);
  let skipFiles: string[] = [];

  if (existingFiles.length > 0) {
    console.log('');
    console.log(chalk.yellow(`Found existing: ${existingFiles.join(', ')}`));

    const action = await select<'merge' | 'backup' | 'skip'>({
      message: 'How would you like to proceed?',
      choices: [
        {
          name: 'Merge - Add LeanSpec section to existing files',
          value: 'merge',
          description: 'Appends LeanSpec guidance to your existing AGENTS.md',
        },
        {
          name: 'Backup - Save existing and create new',
          value: 'backup',
          description: 'Renames existing files to .backup and creates fresh ones',
        },
        {
          name: 'Skip - Keep existing files as-is',
          value: 'skip',
          description: 'Only adds .lspec config and specs/ directory',
        },
      ],
    });

    // Get project name for variable substitution
    const projectName = await getProjectName(cwd);
    
    await handleExistingFiles(action, existingFiles, templateDir, cwd, { project_name: projectName });

    if (action === 'skip') {
      skipFiles = existingFiles;
    }
  }

  // Get project name for variable substitution
  const projectName = await getProjectName(cwd);

  // Copy template files (excluding those we're skipping)
  const filesDir = path.join(templateDir, 'files');
  try {
    await copyDirectory(filesDir, cwd, skipFiles, { project_name: projectName });
    console.log(chalk.green('✓ Initialized project structure'));
  } catch (error) {
    console.error(chalk.red('Error copying template files:'), error);
    process.exit(1);
  }

  console.log('');
  console.log(chalk.green('✓ LeanSpec initialized!'));
  console.log('');
  console.log('Next steps:');
  console.log(chalk.gray('  - Review and customize AGENTS.md'));
  console.log(chalk.gray('  - Check out example spec in specs/'));
  console.log(chalk.gray('  - Create your first spec: lspec create my-feature'));
  console.log('');
}

// Get project name from package.json or directory name
async function getProjectName(cwd: string): Promise<string> {
  try {
    const packageJsonPath = path.join(cwd, 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);
    if (pkg.name) {
      return pkg.name;
    }
  } catch {
    // package.json not found or invalid
  }
  
  // Fallback to directory name
  return path.basename(cwd);
}

// Helper to recursively copy directory with variable substitution
async function copyDirectory(src: string, dest: string, skipFiles: string[] = [], variables: Record<string, string> = {}): Promise<void> {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Check if this file should be skipped
    if (skipFiles.includes(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath, skipFiles, variables);
    } else {
      // Only copy if file doesn't exist
      try {
        await fs.access(destPath);
        // File exists, skip it
      } catch {
        // File doesn't exist, copy it with variable substitution
        let content = await fs.readFile(srcPath, 'utf-8');
        
        // Replace variables in content
        for (const [key, value] of Object.entries(variables)) {
          content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        
        await fs.writeFile(destPath, content, 'utf-8');
      }
    }
  }
}

export async function listTemplates(): Promise<void> {
  console.log('');
  console.log(chalk.green('=== Available Templates ==='));
  console.log('');

  const templates = ['minimal', 'standard', 'enterprise'];

  for (const template of templates) {
    const templateDir = path.join(TEMPLATES_DIR, template);
    const configPath = path.join(templateDir, 'config.json');

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      console.log(chalk.cyan(`${config.name}`));
      console.log(`  ${config.description}`);
      console.log('');
    } catch {
      console.log(chalk.yellow(`  ${template} (config not found)`));
      console.log('');
    }
  }

  console.log(chalk.gray('Initialize with: lspec init'));
  console.log('');
}
