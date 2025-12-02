import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { loadConfig } from '../config.js';
import { resolveSpecPath } from '../utils/path-helpers.js';
import { getSpecFile, parseFrontmatter } from '../frontmatter.js';
import type { SpecFrontmatter } from '../frontmatter.js';
import { spawn } from 'node:child_process';

// Configure marked for terminal output
marked.use(markedTerminal() as Parameters<typeof marked.use>[0]);

interface SpecContent {
  frontmatter: SpecFrontmatter;
  content: string;
  rawContent: string;
  path: string;
  name: string;
  fullPath?: string; // Full absolute path to spec directory for sub-spec loading
}

export interface ViewOptions {
  raw?: boolean;
  json?: boolean;
  noColor?: boolean;
}

/**
 * Read and parse a spec by path/name/number
 * Supports sub-spec files like: "045/DESIGN.md" or "045-dashboard/TESTING.md"
 */
export async function readSpecContent(
  specPath: string,
  cwd: string = process.cwd()
): Promise<SpecContent | null> {
  const config = await loadConfig(cwd);
  const specsDir = path.join(cwd, config.specsDir);

  // Check if specPath includes a sub-file (e.g., "045/DESIGN.md" or "045-dashboard/TESTING.md")
  let resolvedPath: string | null = null;
  let targetFile: string | null = null;
  
  // Split path to check for sub-file
  const pathParts = specPath.split('/').filter(p => p);
  
  if (pathParts.length > 1 && pathParts[pathParts.length - 1].endsWith('.md')) {
    // Last part looks like a file, try to resolve the directory
    const specPart = pathParts.slice(0, -1).join('/');
    const filePart = pathParts[pathParts.length - 1];
    
    resolvedPath = await resolveSpecPath(specPart, cwd, specsDir);
    if (resolvedPath) {
      targetFile = path.join(resolvedPath, filePart);
      
      // Verify the sub-file exists
      try {
        await fs.access(targetFile);
      } catch {
        // Sub-file doesn't exist
        return null;
      }
    }
  }
  
  // If no sub-file detected or resolution failed, try normal spec resolution
  if (!resolvedPath) {
    resolvedPath = await resolveSpecPath(specPath, cwd, specsDir);
    
    if (!resolvedPath) {
      return null;
    }

    // Get the default spec file (README.md)
    targetFile = await getSpecFile(resolvedPath, config.structure.defaultFile);
    
    if (!targetFile) {
      return null;
    }
  }

  // Ensure targetFile is not null before proceeding
  if (!targetFile) {
    return null;
  }

  // Read file content
  const rawContent = await fs.readFile(targetFile, 'utf-8');
  const fileName = path.basename(targetFile);
  const isSubSpec = fileName !== config.structure.defaultFile;

  // Parse frontmatter (only exists in main spec file)
  let frontmatter: SpecFrontmatter | null = null;
  
  if (!isSubSpec) {
    frontmatter = await parseFrontmatter(targetFile, config);
    if (!frontmatter) {
      return null;
    }
  } else {
    // Sub-spec files don't have frontmatter, load from main spec
    const mainSpecFile = await getSpecFile(resolvedPath, config.structure.defaultFile);
    if (mainSpecFile) {
      frontmatter = await parseFrontmatter(mainSpecFile, config);
    }
    
    // If we still can't get frontmatter, create a minimal one
    if (!frontmatter) {
      frontmatter = {
        status: 'planned',
        created: new Date().toISOString().split('T')[0],
      };
    }
  }

  // Extract content without frontmatter (if present)
  const lines = rawContent.split('\n');
  let contentStartIndex = 0;
  
  // Skip frontmatter if present (only in main spec)
  if (!isSubSpec && lines[0] === '---') {
    const closingIndex = lines.findIndex((line, i) => i > 0 && line === '---');
    if (closingIndex > 0) {
      contentStartIndex = closingIndex + 1;
    }
  }
  
  const content = lines.slice(contentStartIndex).join('\n').trim();
  const specName = path.basename(resolvedPath);
  const displayName = isSubSpec ? `${specName}/${fileName}` : specName;

  return {
    frontmatter,
    content,
    rawContent,
    path: resolvedPath,
    name: displayName,
    fullPath: resolvedPath, // Add fullPath for sub-spec loading
  };
}

/**
 * Format frontmatter for display
 */
function formatFrontmatter(frontmatter: SpecFrontmatter): string {
  const lines: string[] = [];
  
  // Status with emoji
  const statusEmojis = {
    planned: '📅',
    'in-progress': '🔨',
    complete: '✅',
    blocked: '🚫',
    cancelled: '❌',
    archived: '📦',
  };
  const statusEmoji = statusEmojis[frontmatter.status] || '📄';
  lines.push(chalk.bold(`${statusEmoji} Status: `) + chalk.cyan(frontmatter.status));

  // Priority with emoji
  if (frontmatter.priority) {
    const priorityEmojis = {
      low: '🟢',
      medium: '🟠',
      high: '🟡',
      critical: '🔴',
    };
    const priorityEmoji = priorityEmojis[frontmatter.priority] || '';
    lines.push(chalk.bold(`${priorityEmoji} Priority: `) + chalk.yellow(frontmatter.priority));
  }

  // Created date
  if (frontmatter.created) {
    lines.push(chalk.bold('📆 Created: ') + chalk.gray(String(frontmatter.created)));
  }

  // Tags
  if (frontmatter.tags && frontmatter.tags.length > 0) {
    const tagStr = frontmatter.tags.map(tag => chalk.blue(`#${tag}`)).join(' ');
    lines.push(chalk.bold('🏷️  Tags: ') + tagStr);
  }

  // Assignee
  if (frontmatter.assignee) {
    lines.push(chalk.bold('👤 Assignee: ') + chalk.green(frontmatter.assignee));
  }

  // Custom fields
  const standardFields = ['status', 'priority', 'created', 'tags', 'assignee'];
  const customFields = Object.entries(frontmatter)
    .filter(([key]) => !standardFields.includes(key))
    .filter(([_, value]) => value !== undefined && value !== null);

  if (customFields.length > 0) {
    lines.push('');
    lines.push(chalk.bold('Custom Fields:'));
    for (const [key, value] of customFields) {
      lines.push(`  ${chalk.gray(key)}: ${chalk.white(String(value))}`);
    }
  }

  return lines.join('\n');
}

/**
 * Display spec with formatted output
 */
function displayFormattedSpec(spec: SpecContent): string {
  const output: string[] = [];
  
  // Header
  output.push('');
  output.push(chalk.bold.cyan(`━━━ ${spec.name} ━━━`));
  output.push('');
  
  // Frontmatter
  output.push(formatFrontmatter(spec.frontmatter));
  output.push('');
  output.push(chalk.gray('─'.repeat(60)));
  output.push('');
  
  return output.join('\n');
}

export function viewCommand(): Command;
export function viewCommand(specPath: string, options?: ViewOptions): Promise<void>;
export function viewCommand(specPath?: string, options: ViewOptions = {}): Command | Promise<void> {
  if (typeof specPath === 'string') {
    return viewSpec(specPath, options);
  }

  return new Command('view')
    .description('View spec content (supports sub-specs like "045/DESIGN.md")')
    .argument('<spec>', 'Spec to view')
    .option('--raw', 'Output raw markdown (for piping/scripting)')
    .option('--json', 'Output as JSON')
    .option('--no-color', 'Disable colors')
    .action(async (target: string, opts: { raw?: boolean; json?: boolean; color?: boolean }) => {
      try {
        await viewSpec(target, {
          raw: opts.raw,
          json: opts.json,
          noColor: opts.color === false,
        });
      } catch (error) {
        console.error('\x1b[31mError:\x1b[0m', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * lean-spec view <spec-name>
 * Display spec with rendered markdown, or output raw/json
 */
export async function viewSpec(
  specPath: string,
  options: ViewOptions = {}
): Promise<void> {
  const spec = await readSpecContent(specPath, process.cwd());
  
  if (!spec) {
    throw new Error(`Spec not found: ${specPath}. Try: lean-spec list`);
  }

  // Handle JSON output
  if (options.json) {
    const jsonOutput = {
      name: spec.name,
      path: spec.path,
      frontmatter: spec.frontmatter,
      content: spec.content,
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
    return;
  }

  // Handle raw markdown output
  if (options.raw) {
    console.log(spec.rawContent);
    return;
  }

  // Default: Display formatted header and frontmatter
  console.log(displayFormattedSpec(spec));
  
  // Render markdown content
  const rendered = await marked(spec.content);
  console.log(rendered);
}

/**
 * Open command - open spec in editor
 */
export interface OpenOptions {
  editor?: string;
}

export function openCommand(): Command;
export function openCommand(specPath: string, options?: OpenOptions): Promise<void>;
export function openCommand(specPath?: string, options: OpenOptions = {}): Command | Promise<void> {
  if (typeof specPath === 'string') {
    return openSpec(specPath, options);
  }

  return new Command('open')
    .description('Open spec in editor')
    .argument('<spec>', 'Spec to open')
    .option('--editor <editor>', 'Specify editor command')
    .action(async (target: string, opts: OpenOptions) => {
      try {
        await openSpec(target, {
          editor: opts.editor,
        });
      } catch (error) {
        console.error('\x1b[31mError:\x1b[0m', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * lean-spec open <spec-name>
 * Open spec in editor
 */
export async function openSpec(
  specPath: string,
  options: OpenOptions = {}
): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const specsDir = path.join(cwd, config.specsDir);

  // Check if specPath includes a sub-file
  let resolvedPath: string | null = null;
  let targetFile: string | null = null;
  
  const pathParts = specPath.split('/').filter(p => p);
  
  if (pathParts.length > 1 && pathParts[pathParts.length - 1].endsWith('.md')) {
    // Last part looks like a file
    const specPart = pathParts.slice(0, -1).join('/');
    const filePart = pathParts[pathParts.length - 1];
    
    resolvedPath = await resolveSpecPath(specPart, cwd, specsDir);
    if (resolvedPath) {
      targetFile = path.join(resolvedPath, filePart);
      
      // Verify the sub-file exists
      try {
        await fs.access(targetFile);
      } catch {
        targetFile = null;
      }
    }
  }
  
  // If no sub-file detected, use default file
  if (!resolvedPath) {
    resolvedPath = await resolveSpecPath(specPath, cwd, specsDir);
    
    if (!resolvedPath) {
      throw new Error(`Spec not found: ${specPath}`);
    }

    targetFile = await getSpecFile(resolvedPath, config.structure.defaultFile);
    
    if (!targetFile) {
      throw new Error(`Spec file not found in: ${resolvedPath}`);
    }
  } else if (!targetFile) {
    throw new Error(`Sub-spec file not found: ${specPath}`);
  }
  
  const specFile = targetFile;

  // Determine editor
  let editor = options.editor;
  
  if (!editor) {
    // Check environment variables
    editor = process.env.VISUAL || process.env.EDITOR;
  }

  if (!editor) {
    // Fall back to system defaults
    const platform = process.platform;
    if (platform === 'darwin') {
      editor = 'open';
    } else if (platform === 'win32') {
      editor = 'start';
    } else {
      editor = 'xdg-open';
    }
  }

  console.log(chalk.gray(`Opening ${targetFile} with ${editor}...`));

  // Spawn editor process - wrap in promise to handle errors properly
  const child = spawn(editor, [targetFile], {
    stdio: 'inherit',
    shell: true,
  });

  // Don't wait for editor to close for GUI editors
  const guiEditors = ['open', 'start', 'xdg-open', 'code', 'atom', 'subl'];
  const editorCommand = editor.trim().split(' ')[0];
  if (editorCommand && guiEditors.includes(editorCommand)) {
    // For GUI editors, handle spawn errors but don't wait for close
    return new Promise<void>((resolve, reject) => {
      child.on('error', (error) => {
        reject(new Error(`Error opening editor: ${error.message}`));
      });
      // Resolve immediately after spawn for GUI editors
      child.unref();
      resolve();
    });
  } else {
    // Wait for terminal editors
    return new Promise<void>((resolve, reject) => {
      child.on('error', (error) => {
        reject(new Error(`Error opening editor: ${error.message}`));
      });
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Editor exited with code ${code}`));
        }
      });
    });
  }
}

