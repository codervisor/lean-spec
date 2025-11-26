import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import chalk from 'chalk';

/**
 * AI Tool configuration for symlink generation
 * Maps tool keys to their expected instruction file names
 */
export interface AIToolConfig {
  file: string;        // The filename expected by the tool (e.g., 'CLAUDE.md')
  description: string; // Human-readable description for prompts
  default: boolean;    // Whether to include by default in quick start
  usesSymlink: boolean; // Whether this tool uses a symlink (false for AGENTS.md itself)
  detection?: {        // Optional auto-detection configuration
    commands?: string[];     // CLI commands to check (e.g., ['claude', 'claude-code'])
    configDirs?: string[];   // Config directories to check (e.g., ['.claude'])
    envVars?: string[];      // Environment variables to check (e.g., ['ANTHROPIC_API_KEY'])
    extensions?: string[];   // VS Code extension IDs to check
  };
}

export type AIToolKey = 'aider' | 'claude' | 'codex' | 'copilot' | 'cursor' | 'droid' | 'gemini' | 'opencode' | 'windsurf';

export const AI_TOOL_CONFIGS: Record<AIToolKey, AIToolConfig> = {
  aider: {
    file: 'AGENTS.md',
    description: 'Aider (uses AGENTS.md)',
    default: false,
    usesSymlink: false,
    detection: {
      commands: ['aider'],
      configDirs: ['.aider'],
    },
  },
  claude: {
    file: 'CLAUDE.md',
    description: 'Claude Code (CLAUDE.md)',
    default: true,
    usesSymlink: true,
    detection: {
      commands: ['claude'],
      configDirs: ['.claude'],
      envVars: ['ANTHROPIC_API_KEY'],
    },
  },
  codex: {
    file: 'AGENTS.md',
    description: 'Codex CLI by OpenAI (uses AGENTS.md)',
    default: false,
    usesSymlink: false,
    detection: {
      commands: ['codex'],
      configDirs: ['.codex'],
      envVars: ['OPENAI_API_KEY'],
    },
  },
  copilot: {
    file: 'AGENTS.md',
    description: 'GitHub Copilot (AGENTS.md - default)',
    default: true,
    usesSymlink: false, // Primary file, no symlink needed
    detection: {
      commands: ['copilot'],
      envVars: ['GITHUB_TOKEN'],
    },
  },
  cursor: {
    file: 'AGENTS.md',
    description: 'Cursor (uses AGENTS.md)',
    default: false,
    usesSymlink: false,
    detection: {
      configDirs: ['.cursor', '.cursorules'],
      commands: ['cursor'],
    },
  },
  droid: {
    file: 'AGENTS.md',
    description: 'Droid by Factory (uses AGENTS.md)',
    default: false,
    usesSymlink: false,
    detection: {
      commands: ['droid'],
    },
  },
  gemini: {
    file: 'GEMINI.md',
    description: 'Gemini CLI (GEMINI.md)',
    default: false,
    usesSymlink: true,
    detection: {
      commands: ['gemini'],
      configDirs: ['.gemini'],
      envVars: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'],
    },
  },
  opencode: {
    file: 'AGENTS.md',
    description: 'OpenCode (uses AGENTS.md)',
    default: false,
    usesSymlink: false,
    detection: {
      commands: ['opencode'],
      configDirs: ['.opencode'],
    },
  },
  windsurf: {
    file: 'AGENTS.md',
    description: 'Windsurf (uses AGENTS.md)',
    default: false,
    usesSymlink: false,
    detection: {
      configDirs: ['.windsurf', '.windsurfrules'],
      commands: ['windsurf'],
    },
  },
};

/**
 * Check if a command exists in PATH
 */
function commandExists(command: string): boolean {
  try {
    const which = process.platform === 'win32' ? 'where' : 'which';
    execSync(`${which} ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists in the user's home directory
 */
async function configDirExists(dirName: string): Promise<boolean> {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  if (!homeDir) return false;
  
  try {
    await fs.access(path.join(homeDir, dirName));
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if an environment variable is set
 */
function envVarExists(varName: string): boolean {
  return !!process.env[varName];
}

/**
 * Check if a VS Code extension is installed
 * Note: This is a best-effort check - may not work in all environments
 */
async function extensionInstalled(extensionId: string): Promise<boolean> {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  if (!homeDir) return false;
  
  // Check common VS Code extension directories
  const extensionDirs = [
    path.join(homeDir, '.vscode', 'extensions'),
    path.join(homeDir, '.vscode-server', 'extensions'),
    path.join(homeDir, '.cursor', 'extensions'),
  ];
  
  for (const extDir of extensionDirs) {
    try {
      const entries = await fs.readdir(extDir);
      // Extension folders are named like 'github.copilot-1.234.567'
      if (entries.some(e => e.toLowerCase().startsWith(extensionId.toLowerCase()))) {
        return true;
      }
    } catch {
      // Directory doesn't exist or not readable
    }
  }
  
  return false;
}

export interface DetectionResult {
  tool: AIToolKey;
  detected: boolean;
  reasons: string[];
}

/**
 * Auto-detect installed AI tools
 * Returns detection results with reasons for each tool
 */
export async function detectInstalledAITools(): Promise<DetectionResult[]> {
  const results: DetectionResult[] = [];
  
  for (const [toolKey, config] of Object.entries(AI_TOOL_CONFIGS)) {
    const reasons: string[] = [];
    const detection = config.detection;
    
    if (!detection) {
      results.push({ tool: toolKey as AIToolKey, detected: false, reasons: [] });
      continue;
    }
    
    // Check commands
    if (detection.commands) {
      for (const cmd of detection.commands) {
        if (commandExists(cmd)) {
          reasons.push(`'${cmd}' command found`);
        }
      }
    }
    
    // Check config directories
    if (detection.configDirs) {
      for (const dir of detection.configDirs) {
        if (await configDirExists(dir)) {
          reasons.push(`~/${dir} directory found`);
        }
      }
    }
    
    // Check environment variables
    if (detection.envVars) {
      for (const envVar of detection.envVars) {
        if (envVarExists(envVar)) {
          reasons.push(`${envVar} env var set`);
        }
      }
    }
    
    // Check VS Code extensions
    if (detection.extensions) {
      for (const ext of detection.extensions) {
        if (await extensionInstalled(ext)) {
          reasons.push(`${ext} extension installed`);
        }
      }
    }
    
    results.push({
      tool: toolKey as AIToolKey,
      detected: reasons.length > 0,
      reasons,
    });
  }
  
  return results;
}

/**
 * Get default selection for AI tools based on auto-detection
 * Falls back to copilot only (AGENTS.md) if nothing is detected
 */
export async function getDefaultAIToolSelection(): Promise<{ defaults: AIToolKey[]; detected: DetectionResult[] }> {
  const detectionResults = await detectInstalledAITools();
  const detectedTools = detectionResults
    .filter(r => r.detected)
    .map(r => r.tool);
  
  // If any tools detected, use those as defaults
  if (detectedTools.length > 0) {
    // Always include copilot if it's detected or nothing else is (AGENTS.md is primary)
    const copilotDetected = detectedTools.includes('copilot');
    if (!copilotDetected) {
      // Check if any detected tool uses AGENTS.md
      const usesAgentsMd = detectedTools.some(t => !AI_TOOL_CONFIGS[t].usesSymlink);
      if (!usesAgentsMd) {
        detectedTools.push('copilot');
      }
    }
    return { defaults: detectedTools, detected: detectionResults };
  }
  
  // Fall back to copilot only (AGENTS.md is the primary file)
  return { defaults: ['copilot'], detected: detectionResults };
}

export interface SymlinkResult {
  file: string;
  created?: boolean;
  skipped?: boolean;
  error?: string;
}

/**
 * Create symlinks for selected AI tools pointing to AGENTS.md
 */
export async function createAgentToolSymlinks(
  cwd: string,
  selectedTools: AIToolKey[]
): Promise<SymlinkResult[]> {
  const results: SymlinkResult[] = [];
  const isWindows = process.platform === 'win32';

  // Get unique files that need symlinks (exclude AGENTS.md itself)
  const filesToCreate = new Set<string>();
  for (const tool of selectedTools) {
    const config = AI_TOOL_CONFIGS[tool];
    if (config.usesSymlink) {
      filesToCreate.add(config.file);
    }
  }

  for (const file of filesToCreate) {
    const targetPath = path.join(cwd, file);
    
    try {
      // Check if file already exists
      try {
        await fs.access(targetPath);
        results.push({ file, skipped: true });
        continue;
      } catch {
        // File doesn't exist, good to create
      }

      if (isWindows) {
        // Windows: Create a copy instead of symlink (symlinks require admin privileges)
        // The copy will be a regular file pointing users to edit AGENTS.md instead
        const windowsContent = `# ${file}

> **Note**: This file is a copy of AGENTS.md for tools that expect ${file}.
> 
> **Important**: Edit AGENTS.md instead. Then run \`lean-spec init\` to regenerate this file,
> or manually copy AGENTS.md to ${file}.

See AGENTS.md for the full LeanSpec AI agent instructions.
`;
        await fs.writeFile(targetPath, windowsContent, 'utf-8');
        results.push({ file, created: true, error: 'created as copy (Windows)' });
      } else {
        // Unix: Create symbolic link
        await fs.symlink('AGENTS.md', targetPath);
        results.push({ file, created: true });
      }
    } catch (error) {
      results.push({ 
        file, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  return results;
}

/**
 * Detect common system prompt files in a directory
 */
export async function detectExistingSystemPrompts(cwd: string): Promise<string[]> {
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

/**
 * Handle existing system prompt files based on user's chosen action
 */
export async function handleExistingFiles(
  action: 'merge-ai' | 'merge-append' | 'overwrite' | 'skip',
  existingFiles: string[],
  templateDir: string,
  cwd: string,
  variables: Record<string, string> = {}
): Promise<void> {
  for (const file of existingFiles) {
    const filePath = path.join(cwd, file);
    // AGENTS.md is now at template root, not in files/ subdirectory
    const templateFilePath = path.join(templateDir, file);

    // Check if template has this file
    try {
      await fs.access(templateFilePath);
    } catch {
      // Template doesn't have this file, skip
      continue;
    }

    if (action === 'merge-ai' && file === 'AGENTS.md') {
      // Create consolidation prompt for AI to merge intelligently
      const existing = await fs.readFile(filePath, 'utf-8');
      let template = await fs.readFile(templateFilePath, 'utf-8');
      
      // Replace variables in template
      for (const [key, value] of Object.entries(variables)) {
        template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }

      // Create AI consolidation prompt file
      const promptPath = path.join(cwd, '.lean-spec', 'MERGE-AGENTS-PROMPT.md');
      const aiPrompt = `# AI Prompt: Consolidate AGENTS.md

## Task
Consolidate the existing AGENTS.md with LeanSpec instructions into a single, coherent document.

## Instructions
1. Read both documents below
2. Merge them intelligently:
   - Preserve ALL existing project-specific information (workflows, SOPs, architecture, conventions)
   - Integrate LeanSpec sections where they fit naturally
   - Remove redundancy and ensure coherent flow
   - Keep the tone and style consistent
3. Replace the existing AGENTS.md with the consolidated version

## Existing AGENTS.md
\`\`\`markdown
${existing}
\`\`\`

## LeanSpec Instructions to Integrate
\`\`\`markdown
${template}
\`\`\`

## Output
Create a single consolidated AGENTS.md that:
- Keeps all existing project context and workflows
- Adds LeanSpec commands and principles where appropriate
- Maintains clear structure and readability
- Removes any duplicate or conflicting guidance
`;

      await fs.mkdir(path.dirname(promptPath), { recursive: true });
      await fs.writeFile(promptPath, aiPrompt, 'utf-8');
      
      console.log(chalk.green(`✓ Created AI consolidation prompt`));
      console.log(chalk.cyan(`  → ${promptPath}`));
      console.log('');
      console.log(chalk.yellow('📝 Next steps:'));
      console.log(chalk.gray('  1. Open .lean-spec/MERGE-AGENTS-PROMPT.md'));
      console.log(chalk.gray('  2. Send it to your AI coding assistant (GitHub Copilot, Cursor, etc.)'));
      console.log(chalk.gray('  3. Let AI create the consolidated AGENTS.md'));
      console.log(chalk.gray('  4. Review and commit the result'));
      console.log('');
    } else if (action === 'merge-append' && file === 'AGENTS.md') {
      // Simple append: add LeanSpec section to existing AGENTS.md
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
      console.log(chalk.green(`✓ Appended LeanSpec section to ${file}`));
      console.log(chalk.yellow('  ⚠ Note: May be verbose. Consider consolidating later.'));
    } else if (action === 'overwrite') {
      // Backup existing file and create fresh one
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
      console.log(chalk.gray(`  💡 Your original content is preserved in ${file}.backup`));
    }
    // If skip, do nothing with this file
  }
}

/**
 * Recursively copy directory with variable substitution and skip list
 */
export async function copyDirectory(
  src: string,
  dest: string,
  skipFiles: string[] = [],
  variables: Record<string, string> = {}
): Promise<void> {
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

/**
 * Get project name from package.json or directory name
 */
export async function getProjectName(cwd: string): Promise<string> {
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
