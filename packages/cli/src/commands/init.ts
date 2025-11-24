import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import { saveConfig, type LeanSpecConfig } from '../config.js';
import {
  detectExistingSystemPrompts,
  handleExistingFiles,
  copyDirectory,
  getProjectName,
} from '../utils/template-helpers.js';
import { 
  getExamplesList, 
  getExample, 
  exampleExists,
  type ExampleMetadata 
} from '../utils/examples.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const EXAMPLES_DIR = path.join(TEMPLATES_DIR, 'examples');

/**
 * Init command - initialize LeanSpec in current directory
 */
export function initCommand(): Command {
  return new Command('init')
    .description('Initialize LeanSpec in current directory')
    .option('-y, --yes', 'Skip prompts and use defaults (quick start with standard template)')
    .option('--template <name>', 'Use specific template (standard or detailed)')
    .option('--example [name]', 'Scaffold an example project for tutorials (interactive if no name provided)')
    .option('--name <dirname>', 'Custom directory name for example project')
    .option('--list', 'List available example projects')
    .action(async (options: { yes?: boolean; template?: string; example?: string; name?: string; list?: boolean }) => {
      if (options.list) {
        await listExamples();
        return;
      }
      
      if (options.example !== undefined) {
        await scaffoldExample(options.example, options.name);
        return;
      }
      
      await initProject(options.yes, options.template);
    });
}

export async function initProject(skipPrompts = false, templateOption?: string): Promise<void> {
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

  let setupMode = 'quick';
  let templateName = templateOption || 'standard'; // Use provided template or default to standard

  // Skip prompts if -y flag is used
  if (skipPrompts) {
    console.log(chalk.gray('Using defaults: quick start with standard template'));
    console.log('');
  } else if (!templateOption) {
    // Only show setup mode prompt if no template was explicitly provided
    // Main question: How to set up?
    setupMode = await select({
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
          description: 'Pick from: standard, detailed',
        },
        // TODO: Re-enable when custom setup mode is implemented
        // {
        //   name: 'Customize everything',
        //   value: 'custom',
        //   description: 'Full control over structure and settings',
        // },
      ],
    });

    if (setupMode === 'template') {
      // Let user choose template
      templateName = await select({
        message: 'Select template:',
        choices: [
          { name: 'standard', value: 'standard', description: 'Recommended - single-file specs with AGENTS.md' },
          {
            name: 'detailed',
            value: 'detailed',
            description: 'Complex specs with sub-spec structure (DESIGN, PLAN, TEST)',
          },
        ],
      });
    }
  }
  // Note: setupMode === 'custom' branch removed - will be implemented in future

  // Handle legacy template names
  if (templateName === 'minimal') {
    console.log(chalk.yellow('⚠ The "minimal" template has been removed.'));
    console.log(chalk.gray('  Using "standard" template instead (same lightweight approach).'));
    console.log('');
    templateName = 'standard';
  } else if (templateName === 'enterprise') {
    console.log(chalk.yellow('⚠ The "enterprise" template has been renamed to "detailed".'));
    console.log(chalk.gray('  Using "detailed" template (sub-spec structure for complex specs).'));
    console.log('');
    templateName = 'detailed';
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

  // Pattern selection (skip for quick start or if -y flag is used)
  let patternChoice = 'simple'; // Default for quick start

  if (setupMode !== 'quick' && !skipPrompts) {
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
  
  // Copy spec templates from template/files/ to .lean-spec/templates/
  const templateFilesDir = path.join(templateDir, 'files');
  
  try {
    const files = await fs.readdir(templateFilesDir);
    
    if (templateName === 'standard') {
      // Standard template: Copy files/README.md as spec-template.md (backward compat)
      const readmePath = path.join(templateFilesDir, 'README.md');
      const targetSpecPath = path.join(templatesDir, 'spec-template.md');
      await fs.copyFile(readmePath, targetSpecPath);
      console.log(chalk.green('✓ Created .lean-spec/templates/spec-template.md'));
      
      // Update config to use spec-template.md
      templateConfig.template = 'spec-template.md';
      templateConfig.templates = {
        default: 'spec-template.md',
      };
    } else if (templateName === 'detailed') {
      // Detailed template: Copy all files preserving names
      for (const file of files) {
        const srcPath = path.join(templateFilesDir, file);
        const destPath = path.join(templatesDir, file);
        await fs.copyFile(srcPath, destPath);
      }
      console.log(chalk.green(`✓ Created .lean-spec/templates/ with ${files.length} files`));
      console.log(chalk.gray(`  Files: ${files.join(', ')}`));
      
      // Update config to use README.md as main template
      templateConfig.template = 'README.md';
      templateConfig.templates = {
        default: 'README.md',
      };
    }
  } catch (error) {
    console.error(chalk.red('Error copying template files:'), error);
    process.exit(1);
  }
  

  // Save config
  await saveConfig(templateConfig, cwd);
  console.log(chalk.green('✓ Created .lean-spec/config.json'));

  // Check for existing system prompt files
  const existingFiles = await detectExistingSystemPrompts(cwd);
  let skipFiles: string[] = [];

  if (existingFiles.length > 0) {
    console.log('');
    console.log(chalk.yellow(`Found existing: ${existingFiles.join(', ')}`));

    if (skipPrompts) {
      // With -y flag, use AI-Assisted Merge as default for existing files
      console.log(chalk.gray('Using AI-Assisted Merge for existing AGENTS.md'));
      const projectName = await getProjectName(cwd);
      await handleExistingFiles('merge-ai', existingFiles, templateDir, cwd, { project_name: projectName });
    } else {
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
  }

  // Get project name for variable substitution
  const projectName = await getProjectName(cwd);

  // Copy AGENTS.md from template root to project root (unless skipping)
  if (!skipFiles.includes('AGENTS.md')) {
    const agentsSourcePath = path.join(templateDir, 'AGENTS.md');
    const agentsTargetPath = path.join(cwd, 'AGENTS.md');
    
    try {
      let agentsContent = await fs.readFile(agentsSourcePath, 'utf-8');
      // Replace variables in AGENTS.md
      agentsContent = agentsContent.replace(/\{project_name\}/g, projectName);
      await fs.writeFile(agentsTargetPath, agentsContent, 'utf-8');
      console.log(chalk.green('✓ Created AGENTS.md'));
    } catch (error) {
      console.error(chalk.red('Error copying AGENTS.md:'), error);
      process.exit(1);
    }
  }

  // Copy any other template files from files/ directory (excluding those we're skipping)
  // Note: files/ directory no longer contains AGENTS.md
  const filesDir = path.join(templateDir, 'files');
  try {
    // Check if files/ directory has any files to copy (besides the spec templates already copied)
    const filesToCopy = await fs.readdir(filesDir);
    const hasOtherFiles = filesToCopy.some(f => !f.match(/\.(md)$/i) || !['README.md', 'DESIGN.md', 'PLAN.md', 'TEST.md'].includes(f));
    
    if (hasOtherFiles) {
      await copyDirectory(filesDir, cwd, [...skipFiles, 'README.md', 'DESIGN.md', 'PLAN.md', 'TEST.md'], { project_name: projectName });
    }
    console.log(chalk.green('✓ Initialized project structure'));
  } catch (error) {
    console.error(chalk.red('Error copying template files:'), error);
    process.exit(1);
  }

  // Create empty specs/ directory
  const specsDir = path.join(cwd, 'specs');
  try {
    await fs.mkdir(specsDir, { recursive: true });
    console.log(chalk.green('✓ Created specs/ directory'));
  } catch (error) {
    console.error(chalk.red('Error creating specs directory:'), error);
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

/**
 * List available example projects
 */
async function listExamples(): Promise<void> {
  const examples = getExamplesList();
  
  console.log('');
  console.log(chalk.bold('Available Examples:'));
  console.log('');
  
  for (const example of examples) {
    const difficultyColor = 
      example.difficulty === 'beginner' ? chalk.green :
      example.difficulty === 'intermediate' ? chalk.yellow :
      chalk.red;
    
    console.log(chalk.cyan(`  ${example.name}`));
    console.log(`    ${example.description}`);
    console.log(`    ${difficultyColor(example.difficulty)} • ${example.tech.join(', ')} • ~${example.lines} lines`);
    console.log(`    Tutorial: ${chalk.gray(example.tutorialUrl)}`);
    console.log('');
  }
  
  console.log('Usage:');
  console.log(chalk.gray('  lean-spec init --example <name>'));
  console.log(chalk.gray('  lean-spec init --example dark-theme'));
  console.log('');
}

/**
 * Scaffold an example project
 */
async function scaffoldExample(exampleName: string, customName?: string): Promise<void> {
  // If no example name provided, show interactive selection
  if (!exampleName) {
    exampleName = await selectExample();
  }
  
  // Validate example exists
  if (!exampleExists(exampleName)) {
    console.error(chalk.red(`Error: Example "${exampleName}" not found.`));
    console.log('');
    console.log('Available examples:');
    getExamplesList().forEach(ex => {
      console.log(`  - ${ex.name}`);
    });
    console.log('');
    console.log('Use: lean-spec init --list');
    process.exit(1);
  }
  
  const example = getExample(exampleName)!;
  const targetDirName = customName || exampleName;
  const targetPath = path.join(process.cwd(), targetDirName);
  
  // Check if directory already exists and is not empty
  try {
    const files = await fs.readdir(targetPath);
    const nonGitFiles = files.filter(f => f !== '.git');
    if (nonGitFiles.length > 0) {
      console.error(chalk.red(`Error: Directory "${targetDirName}" already exists and is not empty.`));
      console.log(chalk.gray('Choose a different name with --name option.'));
      process.exit(1);
    }
  } catch {
    // Directory doesn't exist, that's fine
  }
  
  console.log('');
  console.log(chalk.green(`Setting up example: ${example.title}`));
  console.log(chalk.gray(example.description));
  console.log('');
  
  // Create target directory
  await fs.mkdir(targetPath, { recursive: true });
  console.log(chalk.green(`✓ Created directory: ${targetDirName}/`));
  
  // Copy example template
  const examplePath = path.join(EXAMPLES_DIR, exampleName);
  await copyDirectoryRecursive(examplePath, targetPath);
  console.log(chalk.green('✓ Copied example project'));
  
  // Initialize LeanSpec in the new directory
  const originalCwd = process.cwd();
  try {
    process.chdir(targetPath);
    console.log(chalk.gray('Initializing LeanSpec...'));
    await initProject(true); // Use -y flag for defaults (standard template)
    console.log(chalk.green('✓ Initialized LeanSpec'));
  } catch (error) {
    console.error(chalk.red('Error initializing LeanSpec:'), error);
    process.exit(1);
  } finally {
    process.chdir(originalCwd);
  }
  
  // Detect package manager
  const packageManager = await detectPackageManager();
  
  // Install dependencies
  console.log(chalk.gray(`Installing dependencies with ${packageManager}...`));
  try {
    const { execSync } = await import('node:child_process');
    execSync(`${packageManager} install`, { 
      cwd: targetPath, 
      stdio: 'inherit' 
    });
    console.log(chalk.green('✓ Installed dependencies'));
  } catch (error) {
    console.log(chalk.yellow('⚠ Failed to install dependencies automatically'));
    console.log(chalk.gray(`  Run: cd ${targetDirName} && ${packageManager} install`));
  }
  
  // Show next steps
  console.log('');
  console.log(chalk.green('✓ Example project ready!'));
  console.log('');
  console.log(chalk.gray('Created:'));
  console.log(chalk.gray(`  - Application code (${example.tech.join(', ')})`));
  console.log(chalk.gray('  - LeanSpec files (AGENTS.md, .lean-spec/, specs/)'));
  console.log('');
  console.log('Next steps:');
  console.log(chalk.cyan(`  1. cd ${targetDirName}`));
  console.log(chalk.cyan('  2. Open this project in your editor'));
  console.log(chalk.cyan(`  3. Follow the tutorial: ${example.tutorialUrl}`));
  console.log(chalk.cyan(`  4. Ask your AI: "Help me with this tutorial using LeanSpec"`));
  console.log('');
}

/**
 * Interactive example selection
 */
async function selectExample(): Promise<string> {
  const examples = getExamplesList();
  
  const choice = await select({
    message: 'Select an example project:',
    choices: examples.map(ex => {
      const difficultyLabel = 
        ex.difficulty === 'beginner' ? '★☆☆' :
        ex.difficulty === 'intermediate' ? '★★☆' :
        '★★★';
      
      return {
        name: `${ex.title} (${difficultyLabel})`,
        value: ex.name,
        description: `${ex.description} • ${ex.tech.join(', ')}`,
      };
    }),
  });
  
  return choice;
}

/**
 * Copy directory recursively
 */
async function copyDirectoryRecursive(src: string, dest: string): Promise<void> {
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true });
      await copyDirectoryRecursive(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Detect package manager (pnpm > yarn > npm)
 */
async function detectPackageManager(): Promise<string> {
  const cwd = process.cwd();
  
  // Check for lockfiles in parent directory
  try {
    await fs.access(path.join(cwd, '..', 'pnpm-lock.yaml'));
    return 'pnpm';
  } catch {}
  
  try {
    await fs.access(path.join(cwd, '..', 'yarn.lock'));
    return 'yarn';
  } catch {}
  
  // Default to npm
  return 'npm';
}

