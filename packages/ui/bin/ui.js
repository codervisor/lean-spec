#!/usr/bin/env node

/**
 * @leanspec/ui - Standalone web UI launcher
 * 
 * This is the entry point for the standalone @leanspec/ui package.
 * It wraps the @leanspec/web Next.js application and provides:
 * - CLI argument parsing
 * - Specs directory auto-detection
 * - Environment configuration for filesystem mode
 * - Browser auto-open
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { load as loadYaml } from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    specs: null,
    port: '3000',
    open: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--specs' && i + 1 < args.length) {
      options.specs = args[++i];
    } else if (arg.startsWith('--specs=')) {
      options.specs = arg.slice('--specs='.length);
    } else if (arg === '--port' || arg === '-p') {
      if (i + 1 < args.length) {
        options.port = args[++i];
      }
    } else if (arg.startsWith('--port=')) {
      options.port = arg.slice('--port='.length);
    } else if (arg === '--no-open') {
      options.open = false;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: npx @leanspec/ui [options]

Options:
  --specs <dir>        Specs directory (auto-detected if not specified)
  --port, -p <port>    Port to run on (default: 3000)
  --no-open            Don't open browser automatically
  --help, -h           Show this help message

Examples:
  npx @leanspec/ui
  npx @leanspec/ui --specs ./my-specs
  npx @leanspec/ui --port 4000 --no-open
`);
      process.exit(0);
    }
  }

  return options;
}

/**
 * Auto-detect specs directory
 */
function detectSpecsDirectory(cwd) {
  const candidates = [
    './specs',
    './spec',
    './docs/specs',
    './docs/spec',
    './.lean-spec/specs'
  ];
  
  // Try standard locations first
  for (const candidate of candidates) {
    const fullPath = resolve(cwd, candidate);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  
  // Check for leanspec.yaml config
  const configPath = resolve(cwd, 'leanspec.yaml');
  if (existsSync(configPath)) {
    try {
      const config = loadYaml(readFileSync(configPath, 'utf-8'));
      if (config.specsDir) {
        return resolve(cwd, config.specsDir);
      }
    } catch (error) {
      // Ignore config parse errors
    }
  }
  
  return null;
}

/**
 * Validate port number
 */
function validatePort(port) {
  const portNum = parseInt(port, 10);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    console.error(`✗ Invalid port number: ${port}`);
    console.log('Port must be between 1 and 65535');
    process.exit(1);
  }
  return portNum;
}

/**
 * Find the @leanspec/web package directory
 */
function findWebPackage() {
  // When installed via npm, @leanspec/web will be in node_modules
  const currentDir = dirname(__filename);
  
  // Try relative to this package (node_modules/@leanspec/ui/bin/ui.js)
  // -> node_modules/@leanspec/web
  const webInNodeModules = resolve(currentDir, '../../../@leanspec/web');
  if (existsSync(webInNodeModules)) {
    return webInNodeModules;
  }
  
  // Try in parent node_modules (for pnpm/yarn workspaces)
  const webInParentNodeModules = resolve(currentDir, '../../../../@leanspec/web');
  if (existsSync(webInParentNodeModules)) {
    return webInParentNodeModules;
  }
  
  // In development, might be in monorepo structure
  const webInMonorepo = resolve(currentDir, '../../web');
  if (existsSync(webInMonorepo)) {
    return webInMonorepo;
  }
  
  return null;
}

/**
 * Main entry point
 */
async function main() {
  const options = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();

  // Determine specs directory
  let specsDir;
  if (options.specs) {
    specsDir = resolve(cwd, options.specs);
  } else {
    specsDir = detectSpecsDirectory(cwd);
  }

  // Verify specs directory exists
  if (!specsDir || !existsSync(specsDir)) {
    console.error(`✗ Specs directory not found${specsDir ? `: ${specsDir}` : ''}`);
    console.log('\nTried looking in:');
    console.log('  - ./specs');
    console.log('  - ./spec');
    console.log('  - ./docs/specs');
    console.log('  - ./docs/spec');
    console.log('  - ./.lean-spec/specs');
    console.log('  - leanspec.yaml config file');
    console.log('\nRun `npx lean-spec init` to initialize LeanSpec in this directory.');
    console.log('Or use --specs <dir> to specify a custom location.');
    process.exit(1);
  }

  // Validate port
  const port = validatePort(options.port);

  // Find web package
  const webDir = findWebPackage();
  if (!webDir) {
    console.error('✗ Could not find @leanspec/web package');
    console.log('\nMake sure @leanspec/web is installed:');
    console.log('  npm install @leanspec/web');
    process.exit(1);
  }

  console.log('→ Starting LeanSpec web UI...\n');
  console.log(`  Specs: ${specsDir}`);
  console.log(`  Port:  ${port}`);
  console.log(`  Open:  ${options.open ? 'yes' : 'no'}\n`);

  // Set environment variables for the web server
  const env = {
    ...process.env,
    SPECS_MODE: 'filesystem',
    SPECS_DIR: specsDir,
    PORT: port.toString(),
  };

  // Detect package manager in web directory
  const packageManager = existsSync(join(webDir, '../../pnpm-lock.yaml')) ? 'pnpm' :
                         existsSync(join(webDir, '../../yarn.lock')) ? 'yarn' : 'npm';

  // Start the Next.js dev server
  const child = spawn(packageManager, ['run', 'dev'], {
    cwd: webDir,
    stdio: 'inherit',
    env,
  });

  // Wait for server to be ready
  setTimeout(async () => {
    console.log(`\n✨ LeanSpec UI: http://localhost:${port}\n`);
    console.log('Press Ctrl+C to stop\n');

    if (options.open) {
      try {
        // Dynamic import of open package
        const openModule = await import('open');
        const open = openModule.default;
        await open(`http://localhost:${port}`);
      } catch (error) {
        // If open package not available, just show the URL
        console.log('⚠ Could not open browser automatically');
        console.log('Please visit the URL above manually\n');
      }
    }
  }, 5000);

  // Handle shutdown gracefully
  const sigintHandler = () => {
    child.kill('SIGTERM');
    console.log('\n✓ Web UI stopped');
    process.exit(0);
  };
  process.once('SIGINT', sigintHandler);

  // Handle child process exit
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\nProcess exited with code ${code}`);
      process.exit(code);
    }
  });

  child.on('error', (error) => {
    console.error(`\n✗ Error: ${error.message}`);
    process.exit(1);
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
