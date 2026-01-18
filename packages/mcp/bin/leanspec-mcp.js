#!/usr/bin/env node
/**
 * LeanSpec MCP Server Binary Wrapper
 * 
 * This script detects the current platform and architecture,
 * then spawns the appropriate Rust MCP binary.
 * 
 * The wrapper looks for binaries in the following locations:
 * 1. Platform-specific npm package (@leanspec/mcp-darwin-x64, etc.)
 * 2. Local binaries directory (for development)
 * 3. Rust target directory (for local development)
 */

import { spawn } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { accessSync } from 'fs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Debug mode - enable with LEANSPEC_DEBUG=1
const DEBUG = process.env.LEANSPEC_DEBUG === '1';
const debug = (...args) => DEBUG && console.error('[leanspec-mcp debug]', ...args);

// Platform detection mapping
const PLATFORM_MAP = {
  darwin: { x64: 'darwin-x64', arm64: 'darwin-arm64' },
  linux: { x64: 'linux-x64', arm64: 'linux-arm64' },
  win32: { x64: 'windows-x64', arm64: 'windows-arm64' }
};

function getBinaryPath() {
  const platform = process.platform;
  const arch = process.arch;

  debug('Platform detection:', { platform, arch });

  const platformKey = PLATFORM_MAP[platform]?.[arch];
  if (!platformKey) {
    console.error(`Unsupported platform: ${platform}-${arch}`);
    console.error('Supported: macOS (x64/arm64), Linux (x64/arm64), Windows (x64)');
    process.exit(1);
  }

  const isWindows = platform === 'win32';
  const binaryName = isWindows ? 'leanspec-mcp.exe' : 'leanspec-mcp';
  const packageName = `@leanspec/mcp-${platformKey}`;

  debug('Binary info:', { platformKey, binaryName, packageName });

  // Try to resolve platform package
  try {
    const resolvedPath = require.resolve(`${packageName}/${binaryName}`);
    debug('Found platform package binary:', resolvedPath);
    return resolvedPath;
  } catch (e) {
    debug('Platform package not found:', packageName, '-', e.message);
  }

  // Try local binaries directory (for development/testing)
  try {
    const localPath = join(__dirname, '..', 'binaries', platformKey, binaryName);
    debug('Trying local binary:', localPath);
    accessSync(localPath);
    debug('Found local binary:', localPath);
    return localPath;
  } catch (e) {
    debug('Local binary not found:', e.message);
  }

  // Try rust/target/release directory (for local development)
  try {
    const rustTargetPath = join(__dirname, '..', '..', '..', 'rust', 'target', 'release', binaryName);
    debug('Trying rust target binary:', rustTargetPath);
    accessSync(rustTargetPath);
    debug('Found rust target binary:', rustTargetPath);
    return rustTargetPath;
  } catch (e) {
    debug('Rust target binary not found:', e.message);
  }

  console.error(`Binary not found for ${platform}-${arch}`);
  console.error(`Expected package: ${packageName}`);
  console.error('');
  console.error('To install:');
  console.error('  npm install -g @leanspec/mcp');
  console.error('');
  process.exit(1);
}

// Execute binary
const binaryPath = getBinaryPath();
const args = process.argv.slice(2);

debug('Spawning binary:', binaryPath);
debug('Arguments:', args);

const child = spawn(binaryPath, args, {
  stdio: 'inherit',
  windowsHide: true,
});

child.on('exit', (code) => {
  debug('Binary exited with code:', code);
  process.exit(code ?? 1);
});

child.on('error', (err) => {
  console.error('Failed to start leanspec-mcp:', err.message);
  debug('Spawn error:', err);
  process.exit(1);
});
