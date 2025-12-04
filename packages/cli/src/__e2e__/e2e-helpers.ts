/**
 * E2E Test Helpers
 *
 * Utilities for running end-to-end tests that execute real CLI commands
 * and verify results on an actual filesystem.
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'bin', 'lean-spec.js');

export interface E2EContext {
  tmpDir: string;
  cleanup: () => Promise<void>;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Create an isolated temporary directory for E2E tests
 */
export async function createE2EEnvironment(): Promise<E2EContext> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lean-spec-e2e-'));

  const cleanup = async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  };

  return { tmpDir, cleanup };
}

/**
 * Execute a CLI command and capture output
 */
export function execCli(args: string[], options: { cwd: string; timeout?: number }): ExecResult {
  const { cwd, timeout = 30000 } = options;
  // Properly quote arguments that contain spaces
  const quotedArgs = args.map((arg) => (arg.includes(' ') ? `"${arg}"` : arg));
  const command = `node "${CLI_PATH}" ${quotedArgs.join(' ')}`;

  try {
    const stdout = execSync(command, {
      cwd,
      timeout,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Disable color output for easier assertion
        NO_COLOR: '1',
        FORCE_COLOR: '0',
      },
    });

    return {
      stdout: stdout || '',
      stderr: '',
      exitCode: 0,
    };
  } catch (error: unknown) {
    const execError = error as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number };
    return {
      stdout: execError.stdout?.toString() || '',
      stderr: execError.stderr?.toString() || '',
      exitCode: execError.status ?? 1,
    };
  }
}

/**
 * Execute a CLI command with input (for interactive prompts)
 */
export function execCliWithInput(
  args: string[],
  input: string,
  options: { cwd: string; timeout?: number }
): Promise<ExecResult> {
  const { cwd, timeout = 30000 } = options;

  return new Promise((resolve) => {
    const child = spawn('node', [CLI_PATH, ...args], {
      cwd,
      timeout,
      env: {
        ...process.env,
        NO_COLOR: '1',
        FORCE_COLOR: '0',
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Send input
    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    }

    child.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
      });
    });

    child.on('error', () => {
      resolve({
        stdout,
        stderr,
        exitCode: 1,
      });
    });
  });
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists
 */
export async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Read file content
 */
export async function readFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8');
}

/**
 * Write file content
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Create a directory (recursive)
 */
export async function mkdir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Remove a file or directory
 */
export async function remove(targetPath: string): Promise<void> {
  await fs.rm(targetPath, { recursive: true, force: true });
}

/**
 * List directory contents
 */
export async function listDir(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch {
    return [];
  }
}

/**
 * Get today's date in YYYYMMDD format
 */
export function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Initialize a LeanSpec project using the CLI
 */
export function initProject(cwd: string, options?: { yes?: boolean; force?: boolean }): ExecResult {
  const args = ['init'];
  if (options?.yes) args.push('-y');
  if (options?.force) args.push('-f');
  return execCli(args, { cwd });
}

/**
 * Create a spec using the CLI
 */
export function createSpec(cwd: string, name: string, options?: Record<string, string>): ExecResult {
  const args = ['create', name];
  if (options) {
    for (const [key, value] of Object.entries(options)) {
      args.push(`--${key}`, value);
    }
  }
  return execCli(args, { cwd });
}

/**
 * Update a spec using the CLI
 */
export function updateSpec(cwd: string, specPath: string, options: Record<string, string>): ExecResult {
  const args = ['update', specPath];
  for (const [key, value] of Object.entries(options)) {
    args.push(`--${key}`, value);
  }
  return execCli(args, { cwd });
}

/**
 * Link specs using the CLI
 */
export function linkSpecs(cwd: string, specPath: string, options: { dependsOn?: string }): ExecResult {
  const args = ['link', specPath];
  if (options.dependsOn) args.push('--depends-on', options.dependsOn);
  return execCli(args, { cwd });
}

/**
 * Archive a spec using the CLI
 */
export function archiveSpec(cwd: string, specPath: string): ExecResult {
  return execCli(['archive', specPath], { cwd });
}

/**
 * List specs using the CLI
 */
export function listSpecs(cwd: string, options?: Record<string, string>): ExecResult {
  const args = ['list'];
  if (options) {
    for (const [key, value] of Object.entries(options)) {
      args.push(`--${key}`, value);
    }
  }
  return execCli(args, { cwd });
}

/**
 * View a spec using the CLI
 */
export function viewSpec(cwd: string, specPath: string): ExecResult {
  return execCli(['view', specPath], { cwd });
}

/**
 * Validate specs using the CLI
 */
export function validateSpecs(cwd: string, options?: string[]): ExecResult {
  const args = ['validate', ...(options || [])];
  return execCli(args, { cwd });
}

/**
 * Get spec board using the CLI
 */
export function getBoard(cwd: string): ExecResult {
  return execCli(['board'], { cwd });
}

/**
 * Parse YAML frontmatter from markdown content
 */
export function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result: Record<string, unknown> = {};
  const lines = yaml.split('\n');
  let currentKey: string | null = null;
  let currentArray: string[] | null = null;

  for (const line of lines) {
    // Check if line is an array item (starts with '  - ' or '- ')
    if (line.trim().startsWith('- ')) {
      if (currentArray && currentKey) {
        currentArray.push(line.trim().substring(2).trim());
      }
      continue;
    }

    // If we were building an array, save it
    if (currentArray && currentKey) {
      result[currentKey] = currentArray;
      currentArray = null;
      currentKey = null;
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: unknown = line.slice(colonIndex + 1).trim();

    // Check if this starts a multi-line array (empty value after colon)
    if (value === '') {
      currentKey = key;
      currentArray = [];
      continue;
    }

    // Handle inline arrays [item1, item2]
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim().replace(/^['"]|['"]$/g, ''));
    }
    // Handle quoted strings
    else if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (typeof value === 'string' && value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  // If we ended while building an array, save it
  if (currentArray && currentKey) {
    result[currentKey] = currentArray;
  }

  return result;
}

/**
 * Assert that output contains expected text (case-insensitive)
 */
export function assertOutputContains(result: ExecResult, expected: string): void {
  const combined = (result.stdout + result.stderr).toLowerCase();
  const expectedLower = expected.toLowerCase();
  if (!combined.includes(expectedLower)) {
    throw new Error(
      `Expected output to contain "${expected}"\nActual stdout: ${result.stdout}\nActual stderr: ${result.stderr}`
    );
  }
}

/**
 * Assert that command succeeded (exit code 0)
 */
export function assertSuccess(result: ExecResult): void {
  if (result.exitCode !== 0) {
    throw new Error(
      `Expected command to succeed but got exit code ${result.exitCode}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`
    );
  }
}

/**
 * Assert that command failed (non-zero exit code)
 */
export function assertFailure(result: ExecResult): void {
  if (result.exitCode === 0) {
    throw new Error(`Expected command to fail but it succeeded\nstdout: ${result.stdout}`);
  }
}
