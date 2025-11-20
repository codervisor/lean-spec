#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import open from 'open';
import yaml from 'js-yaml';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const program = new Command();

program
  .name('leanspec-ui')
  .description('Launch the LeanSpec web UI for local spec browsing')
  .option('-s, --specs <dir>', 'Specs directory (auto-detected if omitted)')
  .option('-p, --port <port>', 'Port to run on', '3000')
  .option('--no-open', "Don't open the browser automatically")
  .option('--multi-project', 'Enable multi-project mode')
  .option('--dry-run', 'Show what would run without executing')
  .action(async (options) => {
    try {
      await startUi(options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`✗ ${message}`));
      process.exit(1);
    }
  });

program.parseAsync(process.argv);

async function startUi(options) {
  const cwd = process.cwd();
  const port = validatePort(options.port);
  
  let specsDir = '';
  let specsMode = 'filesystem';

  if (options.multiProject) {
    specsMode = 'multi-project';
  } else {
    specsDir = resolveSpecsDirectory(cwd, options.specs);
  }

  const serverPath = getServerPath();

  if (options.dryRun) {
    printDryRun({ port, specsDir, specsMode, serverPath, openBrowser: options.open });
    return;
  }

  await launchServer({ port, specsDir, specsMode, serverPath, openBrowser: options.open });
}

function validatePort(value) {
  const port = Number.parseInt(value, 10);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${value}. Use a number between 1 and 65535.`);
  }
  return String(port);
}

function resolveSpecsDirectory(cwd, overridePath) {
  if (overridePath) {
    const resolved = resolve(cwd, overridePath);
    if (!existsSync(resolved)) {
      throw new Error(`Specs directory not found: ${resolved}`);
    }
    return resolved;
  }

  const fromConfig = readConfigSpecsDir(cwd);
  if (fromConfig) {
    return fromConfig;
  }

  const candidates = [
    'specs',
    'spec',
    'docs/specs',
    'docs/spec',
    '.lean-spec/specs',
    '.leanspec/specs'
  ];

  for (const candidate of candidates) {
    const candidatePath = resolve(cwd, candidate);
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error('Could not find a specs directory. Run `lean-spec init` or pass --specs <dir>.');
}

function readConfigSpecsDir(cwd) {
  const jsonConfig = join(cwd, '.lean-spec', 'config.json');
  if (existsSync(jsonConfig)) {
    try {
      const config = JSON.parse(readFileSync(jsonConfig, 'utf-8'));
      if (config?.specsDir) {
        const resolved = resolve(cwd, config.specsDir);
        if (existsSync(resolved)) {
          return resolved;
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`⚠ Could not parse ${jsonConfig}: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  const yamlCandidates = ['leanspec.yaml', 'leanspec.yml', 'lean-spec.yaml', 'lean-spec.yml'];
  for (const file of yamlCandidates) {
    const yamlPath = join(cwd, file);
    if (existsSync(yamlPath)) {
      try {
        const parsed = yaml.load(readFileSync(yamlPath, 'utf-8'));
        if (parsed && typeof parsed === 'object' && 'specsDir' in parsed) {
          const resolved = resolve(cwd, parsed.specsDir);
          if (existsSync(resolved)) {
            return resolved;
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`⚠ Could not parse ${yamlPath}: ${error instanceof Error ? error.message : String(error)}`));
      }
    }
  }

  return null;
}

function getServerPath() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const serverPath = resolve(__dirname, '../.next/standalone/packages/ui/server.js');

  if (existsSync(serverPath)) {
    return serverPath;
  }

  throw new Error('LeanSpec UI build not found. Reinstall @leanspec/ui or run pnpm --filter @leanspec/ui build.');
}

function printDryRun({ port, specsDir, specsMode, serverPath, openBrowser }) {
  console.log(chalk.cyan('Would run:'));
  console.log(chalk.dim(`  SPECS_MODE=${specsMode} SPECS_DIR=${specsDir} PORT=${port} node ${serverPath}`));
  if (openBrowser) {
    console.log(chalk.dim(`  open http://localhost:${port}`));
  }
}

async function launchServer({ port, specsDir, specsMode, serverPath, openBrowser }) {
  const spinner = ora('Starting LeanSpec UI...').start();
  const serverDir = dirname(serverPath);
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
    SPECS_MODE: specsMode,
    SPECS_DIR: specsDir,
    PORT: port,
  };

  const child = spawn(process.execPath, [serverPath], {
    cwd: serverDir,
    env,
    stdio: 'inherit',
  });

  const url = `http://localhost:${port}`;
  const readyTimer = setTimeout(async () => {
    spinner.succeed('LeanSpec UI running');
    console.log(chalk.green(`\n✨ LeanSpec UI: ${url}\n`));
    console.log(chalk.dim('Press Ctrl+C to stop\n'));

    if (openBrowser) {
      try {
        await open(url);
      } catch (error) {
        console.warn(chalk.yellow('⚠ Could not open the browser automatically'));
        console.warn(chalk.dim(error instanceof Error ? error.message : String(error)));
      }
    }
  }, 3000);

  const shutdown = () => {
    clearTimeout(readyTimer);
    spinner.stop();
    child.kill('SIGTERM');
    console.log(chalk.dim('\n✓ LeanSpec UI stopped'));
    process.exit(0);
  };

  process.once('SIGINT', shutdown);

  child.on('exit', (code) => {
    clearTimeout(readyTimer);
    spinner.stop();
    if (code && code !== 0) {
      console.error(chalk.red(`\nLeanSpec UI exited with code ${code}`));
      process.exit(code);
    }
  });

  child.on('error', (error) => {
    clearTimeout(readyTimer);
    spinner.fail('Failed to start LeanSpec UI');
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  });
}
