import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { select } from '@inquirer/prompts';
import { saveConfig, type LeanSpecConfig } from '../config.js';
import {
  detectExistingSystemPrompts,
  handleExistingFiles,
  copyDirectory,
  getProjectName,
} from '../utils/template-helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates');

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
