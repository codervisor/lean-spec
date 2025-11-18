import { Command } from 'commander';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../config.js';
import { detectPackageManager, PackageManager } from '../utils/package-manager.js';

/**
 * UI command - start local web UI for spec management
 */
export function uiCommand(): Command {
  return new Command('ui')
    .description('Start local web UI for spec management')
    .option('-s, --specs <dir>', 'Specs directory (auto-detected if not specified)')
    .option('-p, --port <port>', 'Port to run on', '3000')
    .option('--no-open', "Don't open browser automatically")
    .option('--dev', 'Run in development mode (only works in LeanSpec monorepo)')
    .option('--dry-run', 'Show what would run without executing')
    .action(async (options: {
      specs?: string;
      port: string;
      open: boolean;
      dev?: boolean;
      dryRun?: boolean;
    }) => {
      try {
        await startUi(options);
      } catch (error) {
        // Error message already printed, just exit
        process.exit(1);
      }
    });
}

/**
 * Start the web UI
 */
export async function startUi(options: {
  specs?: string;
  port: string;
  open: boolean;
  dev?: boolean;
  dryRun?: boolean;
}): Promise<void> {
  // Validate port
  const portNum = parseInt(options.port, 10);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    console.error(chalk.red(`✗ Invalid port number: ${options.port}`));
    console.log(chalk.dim('Port must be between 1 and 65535'));
    throw new Error(`Invalid port: ${options.port}`);
  }

  const cwd = process.cwd();

  // Determine specs directory
  let specsDir: string;
  if (options.specs) {
    specsDir = resolve(cwd, options.specs);
  } else {
    // Auto-detect from config
    const config = await loadConfig(cwd);
    specsDir = join(cwd, config.specsDir);
  }

  // Verify specs directory exists
  if (!existsSync(specsDir)) {
    console.error(chalk.red(`✗ Specs directory not found: ${specsDir}`));
    console.log(chalk.dim('\nRun `lean-spec init` to initialize LeanSpec in this directory.'));
    throw new Error(`Specs directory not found: ${specsDir}`);
  }

  // Check if --dev flag is set and we're in LeanSpec monorepo
  if (options.dev) {
    const isLeanSpecMonorepo = checkIsLeanSpecMonorepo(cwd);
    if (!isLeanSpecMonorepo) {
      console.error(chalk.red(`✗ Development mode only works in the LeanSpec monorepo`));
      console.log(chalk.dim('Remove --dev flag to use production mode'));
      throw new Error('Not in LeanSpec monorepo');
    }
    const localUiDir = join(cwd, 'packages/ui');
    return runLocalWeb(localUiDir, specsDir, options);
  }

  // Production mode: use published @leanspec/ui
  return runPublishedUI(cwd, specsDir, options);
}

/**
 * Check if we're in the LeanSpec monorepo
 * 
 * This is more specific than just checking for packages/ui to avoid
 * false positives in other projects with similar structure.
 */
function checkIsLeanSpecMonorepo(cwd: string): boolean {
  // Check for LeanSpec-specific markers
  const localUiDir = join(cwd, 'packages/ui');
  const uiPackageJson = join(localUiDir, 'package.json');
  
  if (!existsSync(uiPackageJson)) {
    return false;
  }
  
  try {
    const packageJson = JSON.parse(readFileSync(uiPackageJson, 'utf-8'));
    // Check if it's the @leanspec/ui package
    return packageJson.name === '@leanspec/ui';
  } catch {
    return false;
  }
}

/**
 * Run local ui package (monorepo dev mode)
 * 
 * Spawns the ui dev server as a child process with appropriate environment
 * variables. Only works within the LeanSpec monorepo structure.
 * 
 * @param uiDir - Absolute path to packages/ui directory
 * @param specsDir - Absolute path to specs directory
 * @param options - Command options including port, open, and dryRun flags
 * @throws {Error} If server fails to start
 */
async function runLocalWeb(
  uiDir: string,
  specsDir: string,
  options: {
    port: string;
    open: boolean;
    dev?: boolean;
    dryRun?: boolean;
  }
): Promise<void> {
  console.log(chalk.dim('→ Detected LeanSpec monorepo, using local ui package\n'));

  const repoRoot = resolve(uiDir, '..', '..');
  const packageManager = detectPackageManager(repoRoot);

  if (options.dryRun) {
    console.log(chalk.cyan('Would run:'));
    console.log(chalk.dim(`  cd ${uiDir}`));

    console.log(chalk.dim(`  SPECS_MODE=filesystem SPECS_DIR=${specsDir} PORT=${options.port} ${packageManager} run dev`));
    if (options.open) {
      console.log(chalk.dim(`  open http://localhost:${options.port}`));
    }
    return;
  }

  const spinner = ora('Starting web UI...').start();

  // Set environment variables for the web server
  const env = {
    ...process.env,
    SPECS_MODE: 'filesystem',
    SPECS_DIR: specsDir,
    PORT: options.port,
  };

  const child = spawn(packageManager, ['run', 'dev'], {
    cwd: uiDir,
    stdio: 'inherit',
    env,
    detached: true,
  });

  // Wait for server to be ready
  const readyTimeout = setTimeout(async () => {
    spinner.succeed('Web UI running');
    console.log(chalk.green(`\n✨ LeanSpec UI: http://localhost:${options.port}\n`));
    console.log(chalk.dim('Press Ctrl+C to stop\n'));

    if (options.open) {
      try {
        // Dynamic import of open package
        const openModule = await import('open');
        const open = openModule.default;
        await open(`http://localhost:${options.port}`);
      } catch (error) {
        // If open package not available, just show the URL
        console.log(chalk.yellow('⚠ Could not open browser automatically'));
        console.log(chalk.dim('Please visit the URL above manually\n'));
        console.error(chalk.dim(`Debug: ${error instanceof Error ? error.message : String(error)}`));
      }
    }
  }, 3000);

  // Handle shutdown gracefully (forward signals to child process group)
  const shutdown = (signal?: NodeJS.Signals) => {
    clearTimeout(readyTimeout);
    spinner.stop();
    try {
      if (child && child.pid) {
        // Try killing the whole process group (POSIX)
        try {
          process.kill(-child.pid, signal ?? 'SIGTERM');
        } catch (err) {
          // Fallback to killing the child directly
          child.kill(signal ?? 'SIGTERM');
        }
      }
    } catch (err) {
      // ignore failures to kill
    }

    console.log(chalk.dim('\n✓ Web UI stopped'));
    // Ensure we exit after cleanup
    process.exit(0);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGHUP', () => shutdown('SIGHUP'));

  // If stdin closes (Ctrl+D) treat it as an exit request
  if (process.stdin && !process.stdin.destroyed) {
    process.stdin.once('end', () => shutdown('SIGTERM'));
  }

  // Handle child process exit
  child.on('exit', (code) => {
    clearTimeout(readyTimeout);
    spinner.stop();
    if (code !== 0 && code !== null) {
      spinner.fail('Web UI failed to start');
      console.error(chalk.red(`\nProcess exited with code ${code}`));
      process.exit(code);
    }
    // If child exited cleanly, exit too
    process.exit(0);
  });
}

async function runPublishedUI(
  cwd: string,
  specsDir: string,
  options: {
    port: string;
    open: boolean;
    dev?: boolean;
    dryRun?: boolean;
  }
): Promise<void> {
  console.log(chalk.dim('→ Using published @leanspec/ui package\n'));

  const packageManager = detectPackageManager(cwd);
  const { command, args, preview } = buildUiRunner(packageManager, specsDir, options.port, options.open);

  if (options.dryRun) {
    console.log(chalk.cyan('Would run:'));
    console.log(chalk.dim(`  ${preview}`));
    return;
  }

  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
    detached: true,
  });

  const shutdownPublished = (signal?: NodeJS.Signals) => {
    try {
      if (child && child.pid) {
        try {
          process.kill(-child.pid, signal ?? 'SIGINT');
        } catch (err) {
          child.kill(signal ?? 'SIGINT');
        }
      }
    } catch (err) {
      // ignore
    }
    console.log(chalk.dim('\n✓ Web UI stopped'));
    process.exit(0);
  };

  process.once('SIGINT', () => shutdownPublished('SIGINT'));
  process.once('SIGTERM', () => shutdownPublished('SIGTERM'));
  process.once('SIGHUP', () => shutdownPublished('SIGHUP'));
  if (process.stdin && !process.stdin.destroyed) {
    process.stdin.once('end', () => shutdownPublished('SIGTERM'));
  }

  child.on('exit', (code) => {
    if (code === 0 || code === null) {
      process.exit(0);
      return;
    }
    console.error(chalk.red(`\n@leanspec/ui exited with code ${code}`));
    console.log(chalk.dim('Make sure npm can download @leanspec/ui (https://www.npmjs.com/package/@leanspec/ui).'));
    process.exit(code);
  });

  child.on('error', (error) => {
    console.error(chalk.red(`Failed to launch @leanspec/ui: ${error instanceof Error ? error.message : String(error)}`));
    console.log(chalk.dim('You can also run it manually with `npx @leanspec/ui --specs <dir>`'));
    process.exit(1);
  });
}

function buildUiRunner(
  packageManager: PackageManager,
  specsDir: string,
  port: string,
  openBrowser: boolean
): { command: string; args: string[]; preview: string } {
  const uiArgs = ['@leanspec/ui', '--specs', specsDir, '--port', port];
  if (!openBrowser) {
    uiArgs.push('--no-open');
  }

  if (packageManager === 'pnpm') {
    const args = ['dlx', ...uiArgs];
    return { command: 'pnpm', args, preview: `pnpm ${args.join(' ')}` };
  }

  if (packageManager === 'yarn') {
    const args = ['dlx', ...uiArgs];
    return { command: 'yarn', args, preview: `yarn ${args.join(' ')}` };
  }

  const args = ['--yes', ...uiArgs];
  return { command: 'npx', args, preview: `npx ${args.join(' ')}` };
}
