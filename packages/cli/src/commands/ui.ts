import { Command } from 'commander';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../config.js';

/**
 * UI command - start local web UI for spec management
 */
export function uiCommand(): Command {
  return new Command('ui')
    .description('Start local web UI for spec management')
    .option('-s, --specs <dir>', 'Specs directory (auto-detected if not specified)')
    .option('-p, --port <port>', 'Port to run on', '3000')
    .option('--no-open', "Don't open browser automatically")
    .option('--dry-run', 'Show what would run without executing')
    .action(async (options: {
      specs?: string;
      port: string;
      open: boolean;
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

  // Check if running in LeanSpec monorepo (dev mode)
  const localWebDir = join(cwd, 'packages/web');
  const isMonorepo = existsSync(localWebDir);

  if (isMonorepo) {
    // Dev mode: Run local web package
    return runLocalWeb(localWebDir, specsDir, options);
  } else {
    // Production mode: Run published @leanspec/ui package
    return runPublishedUI(specsDir, options);
  }
}

/**
 * Run local web package (monorepo dev mode)
 * 
 * Spawns the web dev server as a child process with appropriate environment
 * variables. Only works within the LeanSpec monorepo structure.
 * 
 * @param webDir - Absolute path to packages/web directory
 * @param specsDir - Absolute path to specs directory
 * @param options - Command options including port, open, and dryRun flags
 * @throws {Error} If server fails to start
 */
async function runLocalWeb(
  webDir: string,
  specsDir: string,
  options: {
    port: string;
    open: boolean;
    dryRun?: boolean;
  }
): Promise<void> {
  console.log(chalk.dim('→ Detected LeanSpec monorepo, using local web package\n'));

  if (options.dryRun) {
    console.log(chalk.cyan('Would run:'));
    console.log(chalk.dim(`  cd ${webDir}`));
    
    // Detect package manager
    const packageManager = existsSync(join(webDir, '../../pnpm-lock.yaml')) ? 'pnpm' :
                           existsSync(join(webDir, '../../yarn.lock')) ? 'yarn' : 'npm';
    
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

  // Detect package manager
  const packageManager = existsSync(join(webDir, '../../pnpm-lock.yaml')) ? 'pnpm' :
                         existsSync(join(webDir, '../../yarn.lock')) ? 'yarn' : 'npm';

  const child = spawn(packageManager, ['run', 'dev'], {
    cwd: webDir,
    stdio: 'inherit',
    env,
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

  // Handle shutdown gracefully
  const sigintHandler = () => {
    clearTimeout(readyTimeout);
    spinner.stop();
    child.kill('SIGTERM');
    console.log(chalk.dim('\n✓ Web UI stopped'));
    process.exit(0);
  };
  process.once('SIGINT', sigintHandler);

  // Handle child process exit
  child.on('exit', (code) => {
    clearTimeout(readyTimeout);
    spinner.stop();
    if (code !== 0 && code !== null) {
      spinner.fail('Web UI failed to start');
      console.error(chalk.red(`\nProcess exited with code ${code}`));
      process.exit(code);
    }
  });
}

/**
 * Run published @leanspec/ui package (production mode for external projects)
 * 
 * Spawns npx @leanspec/ui as a child process with appropriate arguments.
 * This is used when lean-spec is installed in a project outside the monorepo.
 * 
 * @param specsDir - Absolute path to specs directory
 * @param options - Command options including port, open, and dryRun flags
 * @throws {Error} If @leanspec/ui package is not available or fails to start
 */
async function runPublishedUI(
  specsDir: string,
  options: {
    port: string;
    open: boolean;
    dryRun?: boolean;
  }
): Promise<void> {
  console.log(chalk.dim('→ Running standalone @leanspec/ui package\n'));

  if (options.dryRun) {
    console.log(chalk.cyan('Would run:'));
    const args = [`--specs=${specsDir}`, `--port=${options.port}`];
    if (!options.open) {
      args.push('--no-open');
    }
    console.log(chalk.dim(`  npx @leanspec/ui ${args.join(' ')}`));
    return;
  }

  const spinner = ora('Starting web UI...').start();

  // Build npx arguments
  const args = ['@leanspec/ui', `--specs=${specsDir}`, `--port=${options.port}`];
  if (!options.open) {
    args.push('--no-open');
  }

  // Spawn npx process
  const child = spawn('npx', args, {
    stdio: 'inherit',
    env: {
      ...process.env,
    },
  });

  // Wait for server to be ready (npx handles the server startup)
  const readyTimeout = setTimeout(() => {
    spinner.succeed('Web UI running');
    console.log(chalk.green(`\n✨ LeanSpec UI: http://localhost:${options.port}\n`));
    console.log(chalk.dim('Press Ctrl+C to stop\n'));
  }, 5000); // Longer timeout for npx + cold start

  // Handle shutdown gracefully
  const sigintHandler = () => {
    clearTimeout(readyTimeout);
    spinner.stop();
    child.kill('SIGTERM');
    console.log(chalk.dim('\n✓ Web UI stopped'));
    process.exit(0);
  };
  process.once('SIGINT', sigintHandler);

  // Handle child process exit
  child.on('exit', (code) => {
    clearTimeout(readyTimeout);
    spinner.stop();
    if (code !== 0 && code !== null) {
      spinner.fail('Web UI failed to start');
      
      // Provide helpful error message if package not found
      if (code === 1) {
        console.error(chalk.red('\n✗ @leanspec/ui package not found or failed to start'));
        console.log(chalk.dim('\nThis may happen if:'));
        console.log(chalk.dim('  1. @leanspec/ui has not been published yet'));
        console.log(chalk.dim('  2. Network connectivity issues preventing npx from downloading'));
        console.log(chalk.dim('  3. Node.js version is incompatible (requires Node 20+)'));
        console.log(chalk.dim('\nFor now, you can:'));
        console.log(chalk.dim('  • Use CLI commands (lean-spec list, board, view, etc.)'));
        console.log(chalk.dim('  • Clone the LeanSpec repo and run from there'));
      } else {
        console.error(chalk.red(`\nProcess exited with code ${code}`));
      }
      
      process.exit(code);
    }
  });

  // Handle errors
  child.on('error', (error) => {
    clearTimeout(readyTimeout);
    spinner.fail('Failed to start web UI');
    console.error(chalk.red(`\n✗ Error: ${error.message}`));
    
    if (error.message.includes('ENOENT')) {
      console.log(chalk.dim('\nMake sure npx is available:'));
      console.log(chalk.dim('  npm install -g npm'));
    }
    
    process.exit(1);
  });
}
