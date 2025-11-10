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
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

export async function initProject(): Promise<void> {
  const cwd = process.cwd();

  // Check if already initialized
  try {
    await fs.access(path.join(cwd, '.lean-spec', 'config.json'));
    console.log(chalk.yellow('⚠ LeanSpec already initialized in this directory.'));
    console.log(chalk.gray('To reinitialize, delete .lean-spec/ directory first.'));
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
      // TODO: Re-enable when custom setup mode is implemented
      // {
      //   name: 'Customize everything',
      //   value: 'custom',
      //   description: 'Full control over structure and settings',
      // },
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
  }
  // Note: setupMode === 'custom' branch removed - will be implemented in future

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

  // Pattern selection (skip for quick start)
  let patternChoice = 'simple'; // Default for quick start

  if (setupMode !== 'quick') {
    patternChoice = await select({
      message: 'Select folder pattern:',
      choices: [
        {
          name: 'Simple: 001-my-spec/',
          value: 'simple',
          description: 'Global sequential numbering (recommended)',
        },
        {
          name: 'Date-grouped: 20251105/001-my-spec/',
          value: 'date-grouped',
          description: 'Group specs by creation date (good for teams)',
        },
        {
          name: 'Flat with date: 20251105-001-my-spec/',
          value: 'date-prefix',
          description: 'Date prefix with global numbering',
        },
        {
          name: 'Custom pattern',
          value: 'custom',
          description: 'Enter your own pattern',
        },
      ],
    });
  }

  // Apply pattern choice to config
  if (patternChoice === 'simple') {
    // Default: flat pattern with no prefix
    templateConfig.structure.pattern = 'flat';
    templateConfig.structure.prefix = '';
  } else if (patternChoice === 'date-grouped') {
    // Custom pattern with date grouping
    templateConfig.structure.pattern = 'custom';
    templateConfig.structure.groupExtractor = '{YYYYMMDD}';
    templateConfig.structure.prefix = undefined;
  } else if (patternChoice === 'date-prefix') {
    // Flat pattern with date prefix
    templateConfig.structure.pattern = 'flat';
    templateConfig.structure.prefix = '{YYYYMMDD}-';
  } else if (patternChoice === 'custom') {
    // Custom pattern not yet implemented - fall back to simple
    console.log('');
    console.log(chalk.yellow('⚠ Custom pattern input is not yet implemented.'));
    console.log(chalk.gray('  You can manually edit .lean-spec/config.json after initialization.'));
    console.log(chalk.gray('  Using simple pattern for now.'));
    console.log('');
    templateConfig.structure.pattern = 'flat';
    templateConfig.structure.prefix = '';
  }

  // Create .lean-spec/templates/ directory
  const templatesDir = path.join(cwd, '.lean-spec', 'templates');
  try {
    await fs.mkdir(templatesDir, { recursive: true });
  } catch (error) {
    console.error(chalk.red('Error creating templates directory:'), error);
    process.exit(1);
  }
  
  // Copy chosen template to .lean-spec/templates/spec-template.md
  const templateSpecPath = path.join(templateDir, 'spec-template.md');
  const targetSpecPath = path.join(templatesDir, 'spec-template.md');
  try {
    await fs.copyFile(templateSpecPath, targetSpecPath);
    console.log(chalk.green('✓ Created .lean-spec/templates/spec-template.md'));
  } catch (error) {
    console.error(chalk.red('Error copying template:'), error);
    process.exit(1);
  }
  
  // Update config to use new template structure
  templateConfig.template = 'spec-template.md';
  templateConfig.templates = {
    default: 'spec-template.md',
  };

  // Save config
  await saveConfig(templateConfig, cwd);
  console.log(chalk.green('✓ Created .lean-spec/config.json'));

  // Check for existing system prompt files
  const existingFiles = await detectExistingSystemPrompts(cwd);
  let skipFiles: string[] = [];

  if (existingFiles.length > 0) {
    console.log('');
    console.log(chalk.yellow(`Found existing: ${existingFiles.join(', ')}`));

    const action = await select<'merge-ai' | 'merge-append' | 'overwrite' | 'skip'>({
      message: 'How would you like to handle existing AGENTS.md?',
      choices: [
        {
          name: 'AI-Assisted Merge (recommended)',
          value: 'merge-ai',
          description: 'Creates prompt for AI to intelligently consolidate both files',
        },
        {
          name: 'Simple Append',
          value: 'merge-append',
          description: 'Quickly appends LeanSpec section (may be verbose)',
        },
        {
          name: 'Replace with LeanSpec',
          value: 'overwrite',
          description: 'Backs up existing, creates fresh AGENTS.md from template',
        },
        {
          name: 'Keep Existing Only',
          value: 'skip',
          description: 'Skips AGENTS.md, only adds .lean-spec config and specs/',
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
  console.log(chalk.gray('  - Create your first spec: lean-spec create my-feature'));
  console.log('');
}
