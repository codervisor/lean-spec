import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';
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
}

/**
 * Read and parse a spec by path/name/number
 */
export async function readSpecContent(
  specPath: string,
  cwd: string = process.cwd()
): Promise<SpecContent | null> {
  const config = await loadConfig(cwd);
  const specsDir = path.join(cwd, config.specsDir);

  // Resolve the spec path
  const resolvedPath = await resolveSpecPath(specPath, cwd, specsDir);
  
  if (!resolvedPath) {
    return null;
  }

  // Get the spec file
  const specFile = await getSpecFile(resolvedPath, config.structure.defaultFile);
  
  if (!specFile) {
    return null;
  }

  // Read file content
  const rawContent = await fs.readFile(specFile, 'utf-8');

  // Parse frontmatter
  const frontmatter = await parseFrontmatter(specFile, config);
  
  if (!frontmatter) {
    return null;
  }

  // Extract content without frontmatter
  const lines = rawContent.split('\n');
  let contentStartIndex = 0;
  
  // Skip frontmatter if present
  if (lines[0] === '---') {
    const closingIndex = lines.findIndex((line, i) => i > 0 && line === '---');
    if (closingIndex > 0) {
      contentStartIndex = closingIndex + 1;
    }
  }
  
  const content = lines.slice(contentStartIndex).join('\n').trim();
  const name = path.basename(resolvedPath);

  return {
    frontmatter,
    content,
    rawContent,
    path: resolvedPath,
    name,
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

/**
 * lspec show <spec-name>
 * Display spec with rendered markdown
 */
export async function showCommand(
  specPath: string,
  options: {
    noColor?: boolean;
  } = {}
): Promise<void> {
  const spec = await readSpecContent(specPath, process.cwd());
  
  if (!spec) {
    throw new Error(`Spec not found: ${specPath}. Try: lspec list`);
  }

  // Display formatted header and frontmatter
  console.log(displayFormattedSpec(spec));
  
  // Render markdown content
  const rendered = await marked(spec.content);
  console.log(rendered);
}

/**
 * lspec read <spec-name>
 * Output raw markdown or JSON
 */
export async function readCommand(
  specPath: string,
  options: {
    format?: 'markdown' | 'json';
    frontmatterOnly?: boolean;
  } = {}
): Promise<void> {
  const spec = await readSpecContent(specPath, process.cwd());
  
  if (!spec) {
    throw new Error(`Spec not found: ${specPath}`);
  }

  if (options.frontmatterOnly) {
    console.log(JSON.stringify(spec.frontmatter, null, 2));
    return;
  }

  if (options.format === 'json') {
    const jsonOutput = {
      name: spec.name,
      path: spec.path,
      frontmatter: spec.frontmatter,
      content: spec.content,
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
  } else {
    console.log(spec.rawContent);
  }
}

/**
 * lspec open <spec-name>
 * Open spec in editor
 */
export async function openCommand(
  specPath: string,
  options: {
    editor?: string;
  } = {}
): Promise<void> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const specsDir = path.join(cwd, config.specsDir);

  // Resolve the spec path
  const resolvedPath = await resolveSpecPath(specPath, cwd, specsDir);
  
  if (!resolvedPath) {
    throw new Error(`Spec not found: ${specPath}`);
  }

  // Get the spec file
  const specFile = await getSpecFile(resolvedPath, config.structure.defaultFile);
  
  if (!specFile) {
    throw new Error(`Spec file not found in: ${resolvedPath}`);
  }

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

  console.log(chalk.gray(`Opening ${specFile} with ${editor}...`));

  // Spawn editor process
  const child = spawn(editor, [specFile], {
    stdio: 'inherit',
    shell: true,
  });

  child.on('error', (error) => {
    throw new Error(`Error opening editor: ${error.message}`);
  });

  // Don't wait for editor to close for GUI editors
  const guiEditors = ['open', 'start', 'xdg-open', 'code', 'atom', 'subl'];
  const editorCommand = editor.trim().split(' ')[0];
  if (editorCommand && guiEditors.includes(editorCommand)) {
    // Detach and don't wait
    child.unref();
  } else {
    // Wait for terminal editors
    await new Promise<void>((resolve, reject) => {
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

/**
 * lspec view <spec-name>
 * Alias for show command
 */
export async function viewCommand(
  specPath: string,
  options: Parameters<typeof showCommand>[1]
): Promise<void> {
  return showCommand(specPath, options);
}
