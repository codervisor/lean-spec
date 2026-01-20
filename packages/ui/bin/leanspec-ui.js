#!/usr/bin/env node
/**
 * LeanSpec UI Launcher
 *
 * This script starts the Rust HTTP server and serves the embedded UI
 * from the same process and port.
 */

import { spawn } from 'child_process';
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

// Start the Rust HTTP server (serves API + UI)
let httpServerProcess;
try {
  // Try to resolve @leanspec/http-server
  const httpServerPath = require.resolve('@leanspec/http-server/bin/leanspec-http.js');
  
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

} catch (err) {
  console.error('Error: @leanspec/http-server not found');
  console.error('The UI requires the HTTP server to provide API functionality.');
  console.error('');
  console.error('Install it with:');
  console.error('  npm install -g @leanspec/http-server');
  console.error('');
  console.error('Or install both together:');
  console.error('  npm install -g lean-spec @leanspec/http-server @leanspec/ui');
  process.exit(1);
}

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
