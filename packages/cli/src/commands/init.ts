import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { Command } from 'commander';
import { select, checkbox, confirm } from '@inquirer/prompts';
import { saveConfig, type LeanSpecConfig } from '../config.js';
import {
  detectExistingSystemPrompts,
  handleExistingFiles,
  copyDirectory,
  getProjectName,
  createAgentToolSymlinks,
  AI_TOOL_CONFIGS,
  getDefaultAIToolSelection,
  getCliCapableDetectedTools,
  executeMergeWithAI,
  getDisplayCommand,
  type AIToolKey,
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
 * Attempt to auto-merge AGENTS.md using detected AI CLI tool
 * Returns true if merge was successfully completed
 */
async function attemptAutoMerge(cwd: string, promptPath: string, autoExecute: boolean): Promise<boolean> {
  // Check for CLI-capable AI tools
  const cliTools = await getCliCapableDetectedTools();
  
  if (cliTools.length === 0) {
    // No CLI tools detected, fall back to manual instructions
    return false;
  }
  
  // Use first detected CLI-capable tool
  const tool = cliTools[0];
  const displayCmd = getDisplayCommand(tool.tool, promptPath);
  
  console.log('');
  console.log(chalk.cyan(`🔍 Detected AI CLI: ${tool.config.description}`));
  for (const reason of tool.reasons) {
    console.log(chalk.gray(`   └─ ${reason}`));
  }
  console.log('');
  console.log(chalk.gray(`Command: ${displayCmd}`));
  console.log('');
  
  let shouldExecute = autoExecute;
  
  if (!autoExecute) {
    shouldExecute = await confirm({
      message: 'Run merge automatically using detected AI CLI?',
      default: true,
    });
  }
  
  if (!shouldExecute) {
    console.log(chalk.gray('Skipping auto-merge. Run the command above manually to merge.'));
    return false;
  }
  
  console.log('');
  console.log(chalk.cyan('🤖 Running AI-assisted merge...'));
  console.log(chalk.gray('   (This may take a moment)'));
  console.log('');
  
  const result = await executeMergeWithAI(cwd, promptPath, tool.tool);
  
  if (result.success) {
    console.log('');
    console.log(chalk.green('✓ AGENTS.md merged successfully!'));
    console.log(chalk.gray('  Review changes: git diff AGENTS.md'));
    return true;
  } else if (result.timedOut) {
    console.log('');
    console.log(chalk.yellow('⚠ Merge timed out. Try running the command manually:'));
    console.log(chalk.gray(`   ${displayCmd}`));
    return false;
  } else {
    console.log('');
    console.log(chalk.yellow(`⚠ Auto-merge encountered an issue: ${result.error}`));
    console.log(chalk.gray('  Try running the command manually:'));
    console.log(chalk.gray(`   ${displayCmd}`));
    return false;
  }
}

/**
 * Re-initialization strategy options
 */
type ReinitStrategy = 'upgrade' | 'reset-config' | 'full-reset' | 'cancel';

/**
 * Handle re-initialization when LeanSpec is already initialized
 */
async function handleReinitialize(cwd: string, skipPrompts: boolean, forceReinit: boolean): Promise<ReinitStrategy> {
  const specsDir = path.join(cwd, 'specs');
  let specCount = 0;
  
  try {
    const entries = await fs.readdir(specsDir, { withFileTypes: true });
    specCount = entries.filter(e => e.isDirectory()).length;
  } catch {
    // specs/ doesn't exist
  }
  
  console.log('');
  console.log(chalk.yellow('⚠ LeanSpec is already initialized in this directory.'));
  
  if (specCount > 0) {
    console.log(chalk.cyan(`  Found ${specCount} spec${specCount > 1 ? 's' : ''} in specs/`));
  }
  console.log('');
  
  // Force flag: reset config but preserve specs (safe default)
  if (forceReinit) {
    console.log(chalk.gray('Force flag detected. Resetting configuration...'));
    return 'reset-config';
  }
  
  // With -y flag, default to upgrade (safest)
  if (skipPrompts) {
    console.log(chalk.gray('Using safe upgrade (preserving all existing files)'));
    return 'upgrade';
  }
  
  // Interactive mode: let user choose
  const strategy = await select<ReinitStrategy>({
    message: 'What would you like to do?',
    choices: [
      {
        name: 'Upgrade configuration (recommended)',
        value: 'upgrade',
        description: 'Update config to latest version. Keeps specs and AGENTS.md untouched.',
      },
      {
        name: 'Reset configuration',
        value: 'reset-config', 
        description: 'Fresh config from template. Keeps specs/ directory.',
      },
      {
        name: 'Full reset',
        value: 'full-reset',
        description: 'Remove .lean-spec/, specs/, and AGENTS.md. Start completely fresh.',
      },
      {
        name: 'Cancel',
        value: 'cancel',
        description: 'Exit without changes.',
      },
    ],
  });
  
  // Confirm destructive actions
  if (strategy === 'full-reset') {
    const warnings: string[] = [];
    
    if (specCount > 0) {
      warnings.push(`${specCount} spec${specCount > 1 ? 's' : ''} in specs/`);
    }
    
    try {
      await fs.access(path.join(cwd, 'AGENTS.md'));
      warnings.push('AGENTS.md');
    } catch {}
    
    if (warnings.length > 0) {
      console.log('');
      console.log(chalk.red('⚠ This will permanently delete:'));
      for (const warning of warnings) {
        console.log(chalk.red(`  - ${warning}`));
      }
      console.log('');
      
      const confirmed = await confirm({
        message: 'Are you sure you want to continue?',
        default: false,
      });
      
      if (!confirmed) {
        console.log(chalk.gray('Cancelled.'));
        return 'cancel';
      }
    }
    
    // Perform full reset
    console.log(chalk.gray('Performing full reset...'));
    
    // Remove .lean-spec/
    await fs.rm(path.join(cwd, '.lean-spec'), { recursive: true, force: true });
    console.log(chalk.gray('  Removed .lean-spec/'));
    
    // Remove specs/
    try {
      await fs.rm(specsDir, { recursive: true, force: true });
      console.log(chalk.gray('  Removed specs/'));
    } catch {}
    
    // Remove AGENTS.md and symlinks
    for (const file of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) {
      try {
        await fs.rm(path.join(cwd, file), { force: true });
        console.log(chalk.gray(`  Removed ${file}`));
      } catch {}
    }
  }
  
  return strategy;
}

/**
 * Upgrade existing LeanSpec configuration
 * This preserves all user content (specs, AGENTS.md) while updating config
 */
async function upgradeConfig(cwd: string): Promise<void> {
  const configPath = path.join(cwd, '.lean-spec', 'config.json');
  
  // Read existing config
  let existingConfig: LeanSpecConfig;
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    existingConfig = JSON.parse(content);
  } catch {
    console.error(chalk.red('Error reading existing config'));
    process.exit(1);
  }
  
  // Load standard template config as reference for defaults
  const templateConfigPath = path.join(TEMPLATES_DIR, 'standard', 'config.json');
  let templateConfig: LeanSpecConfig;
  try {
    const content = await fs.readFile(templateConfigPath, 'utf-8');
    templateConfig = JSON.parse(content).config;
  } catch {
    console.error(chalk.red('Error reading template config'));
    process.exit(1);
  }
  
  // Merge configs - preserve user settings, add new defaults
  const upgradedConfig: LeanSpecConfig = {
    ...templateConfig,
    ...existingConfig,
    // Deep merge structure
    structure: {
      ...templateConfig.structure,
      ...existingConfig.structure,
    },
  };
  
  // Ensure templates directory exists
  const templatesDir = path.join(cwd, '.lean-spec', 'templates');
  try {
    await fs.mkdir(templatesDir, { recursive: true });
  } catch {}
  
  // Check if templates need updating
  const templateFiles = ['spec-template.md'];
  let templatesUpdated = false;
  
  for (const file of templateFiles) {
    const destPath = path.join(templatesDir, file);
    try {
      await fs.access(destPath);
      // File exists, don't overwrite
    } catch {
      // File doesn't exist, copy from template
      const srcPath = path.join(TEMPLATES_DIR, 'standard', 'files', 'README.md');
      try {
        await fs.copyFile(srcPath, destPath);
        templatesUpdated = true;
        console.log(chalk.green(`✓ Added missing template: ${file}`));
      } catch {}
    }
  }
  
  // Save upgraded config
  await saveConfig(upgradedConfig, cwd);
  
  console.log('');
  console.log(chalk.green('✓ Configuration upgraded!'));
  console.log('');
  console.log(chalk.gray('What was updated:'));
  console.log(chalk.gray('  - Config merged with latest defaults'));
  if (templatesUpdated) {
    console.log(chalk.gray('  - Missing templates added'));
  }
  console.log('');
  console.log(chalk.gray('What was preserved:'));
  console.log(chalk.gray('  - Your specs/ directory'));
  console.log(chalk.gray('  - Your AGENTS.md'));
  console.log(chalk.gray('  - Your custom settings'));
  console.log('');
}

/**
 * Init command - initialize LeanSpec in current directory
 */
export function initCommand(): Command {
  return new Command('init')
    .description('Initialize LeanSpec in current directory')
    .option('-y, --yes', 'Skip prompts and use defaults (quick start with standard template)')
    .option('-f, --force', 'Force re-initialization (resets config, keeps specs)')
    .option('--template <name>', 'Use specific template (standard or detailed)')
    .option('--example [name]', 'Scaffold an example project for tutorials (interactive if no name provided)')
    .option('--name <dirname>', 'Custom directory name for example project')
    .option('--list', 'List available example projects')
    .option('--agent-tools <tools>', 'AI tools to create symlinks for (comma-separated: claude,gemini,copilot or "all" or "none")')
    .action(async (options: { yes?: boolean; force?: boolean; template?: string; example?: string; name?: string; list?: boolean; agentTools?: string }) => {
      if (options.list) {
        await listExamples();
        return;
      }
      
      if (options.example !== undefined) {
        await scaffoldExample(options.example, options.name);
        return;
      }
      
      await initProject(options.yes, options.template, options.agentTools, options.force);
    });
}

export async function initProject(skipPrompts = false, templateOption?: string, agentToolsOption?: string, forceReinit = false): Promise<void> {
  const cwd = process.cwd();

  // Check if already initialized
  const configPath = path.join(cwd, '.lean-spec', 'config.json');
  let isAlreadyInitialized = false;
  
  try {
    await fs.access(configPath);
    isAlreadyInitialized = true;
  } catch {
    // Not initialized, continue with fresh init
  }

  // Handle re-initialization
  if (isAlreadyInitialized) {
    const strategy = await handleReinitialize(cwd, skipPrompts, forceReinit);
    
    if (strategy === 'cancel') {
      return;
    }
    
    if (strategy === 'upgrade') {
      await upgradeConfig(cwd);
      return;
    }
    
    // For 'reset-config' and 'full-reset', we continue with normal init flow
    // but 'full-reset' will have already cleaned up the directory
    if (strategy === 'reset-config') {
      // Just remove config, keep specs
      await fs.rm(path.join(cwd, '.lean-spec'), { recursive: true, force: true });
      console.log(chalk.gray('Removed .lean-spec/ configuration'));
    }
  }

  console.log('');
  console.log(chalk.green('Welcome to LeanSpec!'));
  console.log('');

  let setupMode = 'quick';
  let templateName = templateOption || 'standard'; // Use provided template or default to standard
  let selectedAgentTools: AIToolKey[] = [];

  // Parse agent tools option if provided
  if (agentToolsOption) {
    if (agentToolsOption === 'all') {
      selectedAgentTools = Object.keys(AI_TOOL_CONFIGS) as AIToolKey[];
    } else if (agentToolsOption === 'none') {
      selectedAgentTools = [];
    } else {
      selectedAgentTools = agentToolsOption.split(',').map(t => t.trim()) as AIToolKey[];
    }
  }

  // Skip prompts if -y flag is used
  if (skipPrompts) {
    console.log(chalk.gray('Using defaults: quick start with standard template'));
    // Default to Copilot only (AGENTS.md) when using -y
    if (!agentToolsOption) {
      selectedAgentTools = ['copilot'];
    }
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

  // AI tool selection (skip only if -y flag is used or --agent-tools was provided)
  // Quick start should still ask this question - it's important for AI tool UX
  if (!skipPrompts && !agentToolsOption) {
    // Auto-detect installed AI tools for smart defaults
    const { defaults: detectedDefaults, detected: detectionResults } = await getDefaultAIToolSelection();
    const anyDetected = detectionResults.some(r => r.detected);
    
    // Show detection info if any tools were found
    if (anyDetected) {
      console.log('');
      console.log(chalk.cyan('🔍 Detected AI tools:'));
      for (const result of detectionResults) {
        if (result.detected) {
          console.log(chalk.gray(`   ${AI_TOOL_CONFIGS[result.tool].description}`));
          for (const reason of result.reasons) {
            console.log(chalk.gray(`      └─ ${reason}`));
          }
        }
      }
      console.log('');
    }

    // Only show tools that require symlinks (Claude, Gemini)
    // Filter to only show tools that require symlinks
    const symlinkTools = Object.entries(AI_TOOL_CONFIGS)
      .filter(([, config]) => config.usesSymlink)
      .map(([key, config]) => ({
        name: config.description,
        value: key as AIToolKey,
        checked: detectedDefaults.includes(key as AIToolKey),
      }));

    // Ask about symlinks only if there are tools that need them
    if (symlinkTools.length > 0) {
      console.log('');
      console.log(chalk.gray('AGENTS.md will be created as the primary instruction file.'));
      console.log(chalk.gray('Some AI tools (Claude Code, Gemini CLI) use their own filenames.'));
      console.log('');
      
      const symlinkSelection = await checkbox({
        message: 'Create symlinks for additional AI tools?',
        choices: symlinkTools,
      });
      selectedAgentTools = symlinkSelection;
    } else {
      selectedAgentTools = [];
    }
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
  let mergeCompleted = false;

  if (existingFiles.length > 0) {
    console.log('');
    console.log(chalk.yellow(`Found existing: ${existingFiles.join(', ')}`));

    if (skipPrompts) {
      // With -y flag, use AI-Assisted Merge as default for existing files
      console.log(chalk.gray('Using AI-Assisted Merge for existing AGENTS.md'));
      const projectName = await getProjectName(cwd);
      await handleExistingFiles('merge-ai', existingFiles, templateDir, cwd, { project_name: projectName });
      
      // Auto-execute merge if CLI tool is available
      const promptPath = path.join(cwd, '.lean-spec', 'MERGE-AGENTS-PROMPT.md');
      mergeCompleted = await attemptAutoMerge(cwd, promptPath, true /* skipPrompts */);
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
      } else if (action === 'merge-ai') {
        // Offer auto-merge if CLI tool is available
        const promptPath = path.join(cwd, '.lean-spec', 'MERGE-AGENTS-PROMPT.md');
        mergeCompleted = await attemptAutoMerge(cwd, promptPath, false /* skipPrompts */);
      }
    }
  }

  // Get project name for variable substitution
  const projectName = await getProjectName(cwd);

  // Copy AGENTS.md from template root to project root (unless skipping or already merged)
  if (!skipFiles.includes('AGENTS.md') && !mergeCompleted) {
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

    // Create symlinks for selected AI tools
    if (selectedAgentTools.length > 0) {
      const symlinkResults = await createAgentToolSymlinks(cwd, selectedAgentTools);
      for (const result of symlinkResults) {
        if (result.created) {
          console.log(chalk.green(`✓ Created ${result.file} → AGENTS.md`));
        } else if (result.skipped) {
          console.log(chalk.yellow(`⚠ Skipped ${result.file} (already exists)`));
        } else if (result.error) {
          console.log(chalk.yellow(`⚠ Could not create ${result.file}: ${result.error}`));
        }
      }
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
  console.log(chalk.cyan('You\'re ready to go!') + chalk.gray(' Ask your AI to create a spec for your next feature.'));
  console.log('');
  console.log(chalk.gray('Example: "Create a spec for user authentication"'));
  console.log(chalk.gray('Learn more: https://lean-spec.dev/docs/guide/getting-started'));
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

