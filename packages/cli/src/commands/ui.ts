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
    // Future: Production mode would run published @leanspec/ui package
    console.error(chalk.yellow('\n⚠ Standalone UI package not yet available'));
    console.log(chalk.dim('\nThe `lean-spec ui` command currently only works in the LeanSpec monorepo.'));
    console.log(chalk.dim('Support for external projects will be added in a future release.'));
    console.log(chalk.dim('\nFor now, you can:'));
    console.log(chalk.dim('  1. Use CLI commands (lean-spec list, board, view, etc.)'));
    console.log(chalk.dim('  2. Clone the LeanSpec repo and run from there'));
    throw new Error('Standalone UI package not yet available');
  }
}

/**
 * Run local web package (monorepo dev mode)
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
    console.log(chalk.dim(`  SPECS_MODE=filesystem SPECS_DIR=${specsDir} PORT=${options.port} npm run dev`));
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

  const child = spawn('npm', ['run', 'dev'], {
    cwd: webDir,
    stdio: 'inherit',
    env,
  });

  // Wait for server to be ready
  setTimeout(async () => {
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
      }
    }
  }, 3000);

  // Handle shutdown gracefully
  process.on('SIGINT', () => {
    spinner.stop();
    child.kill('SIGTERM');
    console.log(chalk.dim('\n✓ Web UI stopped'));
    process.exit(0);
  });

  // Handle child process exit
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      spinner.fail('Web UI failed to start');
      console.error(chalk.red(`\nProcess exited with code ${code}`));
      process.exit(code);
    }
  });
}
