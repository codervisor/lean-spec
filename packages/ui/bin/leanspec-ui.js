#!/usr/bin/env node
/**
 * LeanSpec UI Launcher
 *
 * This script starts the Rust HTTP server and serves the embedded UI
 * from the same process and port.
 */

import { spawn, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIST_DIR = join(__dirname, '..', 'dist');

// Check if dist exists
if (!existsSync(DIST_DIR)) {
  console.error('Error: UI build not found!');
  console.error('Expected directory:', DIST_DIR);
  console.error('');
  console.error('The @leanspec/ui package must be built before running.');
  console.error('This is typically done during the npm publish process.');
  process.exit(1);
}

/**
 * Try to resolve @leanspec/http-server from multiple locations
 */
function resolveHttpServer() {
  // Try local resolution first
  try {
    return require.resolve('@leanspec/http-server/bin/leanspec-http.js');
  } catch {
    // Continue to try other locations
  }
  
  // Try resolving from global npm modules
  try {
    const npmRoot = spawnSync('npm', ['root', '-g'], { 
      encoding: 'utf8', 
      shell: true 
    });
    if (npmRoot.status === 0 && npmRoot.stdout) {
      const globalPath = join(
        npmRoot.stdout.trim(), 
        '@leanspec', 
        'http-server', 
        'bin', 
        'leanspec-http.js'
      );
      if (existsSync(globalPath)) {
        return globalPath;
      }
    }
  } catch {
    // Continue
  }
  
  return null;
}

/**
 * Auto-install @leanspec/http-server globally using npm
 */
function installHttpServer() {
  console.log('📦 @leanspec/http-server not found, installing globally...');
  console.log('');
  
  // Get the version of @leanspec/ui to match
  const uiPkg = JSON.parse(
    require('fs').readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
  );
  const version = uiPkg.version;
  const packageSpec = version.includes('dev') 
    ? '@leanspec/http-server@dev' 
    : `@leanspec/http-server@^${version}`;
  
  // Install globally so it persists across npx runs
  const result = spawnSync('npm', ['install', '-g', packageSpec], {
    stdio: 'inherit',
    shell: true
  });
  
  if (result.status !== 0) {
    console.error('');
    console.error('Failed to auto-install @leanspec/http-server');
    console.error('');
    console.error('Please install manually:');
    console.error('  npm install -g @leanspec/http-server');
    process.exit(1);
  }
  
  console.log('');
  console.log('✅ @leanspec/http-server installed globally');
  console.log('');
}

// Try to resolve http-server, install if needed
let httpServerPath = resolveHttpServer();
if (!httpServerPath) {
  installHttpServer();
  httpServerPath = resolveHttpServer();
  
  if (!httpServerPath) {
    console.error('Error: Failed to resolve @leanspec/http-server after installation');
    console.error('Please try installing manually: npm install -g @leanspec/http-server');
    process.exit(1);
  }
}

// Start the Rust HTTP server (serves API + UI)
let httpServerProcess;

console.log('🚀 Starting LeanSpec HTTP server...');
const args = process.argv.slice(2);

httpServerProcess = spawn('node', [httpServerPath, ...args], {
  stdio: 'inherit',
  env: { ...process.env, LEANSPEC_UI_DIST: DIST_DIR }
});

httpServerProcess.on('error', (err) => {
  console.error('Failed to start HTTP server:', err.message);
  console.error('\nThe UI requires @leanspec/http-server to function.');
  console.error('Install it with: npm install @leanspec/http-server');
  process.exit(1);
});

// Wait a moment for the HTTP server to start
await new Promise(resolve => setTimeout(resolve, 1000));

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  if (httpServerProcess) {
    httpServerProcess.kill();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (httpServerProcess) {
    httpServerProcess.kill();
  }
  process.exit(0);
});
