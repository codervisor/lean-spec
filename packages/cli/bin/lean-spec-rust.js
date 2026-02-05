#!/usr/bin/env node
/**
 * LeanSpec CLI Binary Wrapper
 * 
 * This script detects the current platform and architecture,
 * then spawns the appropriate Rust binary with the provided arguments.
 * 
 * The wrapper looks for binaries in the following locations:
 * 1. Platform-specific npm package (lean-spec-darwin-x64, etc.)
 * 2. Local binaries directory (for development)
 */

import { spawn } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { accessSync, openSync, readSync, closeSync } from 'fs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Debug mode - enable with LEANSPEC_DEBUG=1
const DEBUG = process.env.LEANSPEC_DEBUG === '1';
const debug = (...args) => DEBUG && console.error('[lean-spec debug]', ...args);

// Platform detection mapping
const PLATFORM_MAP = {
  darwin: { x64: 'darwin-x64', arm64: 'darwin-arm64' },
  linux: { x64: 'linux-x64' },
  win32: { x64: 'windows-x64', arm64: 'windows-arm64' }
};

const MACHO_MAGICS = new Set([
  0xfeedface,
  0xfeedfacf,
  0xcefaedfe,
  0xcffaedfe,
  0xcafebabe,
  0xbebafeca,
]);

function readHeaderBytes(filePath) {
  const fd = openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(4);
    const bytesRead = readSync(fd, buffer, 0, 4, 0);
    return bytesRead === 4 ? buffer : null;
  } finally {
    closeSync(fd);
  }
}

function isValidBinaryHeader(filePath, platform) {
  try {
    const header = readHeaderBytes(filePath);
    if (!header) return false;

    if (platform === 'linux') {
      return header[0] === 0x7f && header[1] === 0x45 && header[2] === 0x4c && header[3] === 0x46;
    }

    if (platform === 'win32') {
      return header[0] === 0x4d && header[1] === 0x5a;
    }

    if (platform === 'darwin') {
      const magicBE = header.readUInt32BE(0);
      const magicLE = header.readUInt32LE(0);
      return MACHO_MAGICS.has(magicBE) || MACHO_MAGICS.has(magicLE);
    }

    return false;
  } catch (error) {
    debug('Failed to read binary header:', error.message);
    return false;
  }
}

function isExecutableBinary(filePath, platform) {
  if (!isValidBinaryHeader(filePath, platform)) {
    debug('Invalid binary header:', filePath);
    return false;
  }
  return true;
}

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
  const binaryName = isWindows ? 'lean-spec.exe' : 'lean-spec';
  const packageName = `@leanspec/cli-${platformKey}`;
  
  debug('Binary info:', { platformKey, binaryName, packageName });

  // Try to resolve platform package
  try {
    const resolvedPath = require.resolve(`${packageName}/${binaryName}`);
    if (isExecutableBinary(resolvedPath, platform)) {
      debug('Found platform package binary:', resolvedPath);
      return resolvedPath;
    }
    debug('Platform package binary is invalid:', resolvedPath);
  } catch (e) {
    debug('Platform package not found:', packageName, '-', e.message);
  }

  // Try local binaries directory (for development/testing)
  try {
    const localPath = join(__dirname, '..', 'binaries', platformKey, binaryName);
    debug('Trying local binary:', localPath);
    accessSync(localPath);
    if (isExecutableBinary(localPath, platform)) {
      debug('Found local binary:', localPath);
      return localPath;
    }
    debug('Local binary is invalid:', localPath);
  } catch (e) {
    debug('Local binary not found:', e.message);
  }

  // Try rust/target/debug directory first (for local development with `pnpm build:rust`)
  try {
    const rustDebugPath = join(__dirname, '..', '..', '..', 'rust', 'target', 'debug', binaryName);
    debug('Trying rust debug binary:', rustDebugPath);
    accessSync(rustDebugPath);
    if (isExecutableBinary(rustDebugPath, platform)) {
      debug('Found rust debug binary:', rustDebugPath);
      return rustDebugPath;
    }
    debug('Rust debug binary is invalid:', rustDebugPath);
  } catch (e) {
    debug('Rust debug binary not found:', e.message);
  }

  // Try rust/target/release directory (for local development with `pnpm build:rust:release`)
  try {
    const rustTargetPath = join(__dirname, '..', '..', '..', 'rust', 'target', 'release', binaryName);
    debug('Trying rust release binary:', rustTargetPath);
    accessSync(rustTargetPath);
    if (isExecutableBinary(rustTargetPath, platform)) {
      debug('Found rust release binary:', rustTargetPath);
      return rustTargetPath;
    }
    debug('Rust release binary is invalid:', rustTargetPath);
  } catch (e) {
    debug('Rust release binary not found:', e.message);
  }

  console.error(`Binary not found for ${platform}-${arch}`);
  console.error(`Expected package: ${packageName}`);
  console.error('');
  console.error('Detected missing or corrupted binary.');
  console.error('If you installed globally, reinstall to restore the binary:');
  console.error('  npm uninstall -g lean-spec && npm install -g lean-spec');
  console.error('');
  console.error('If your npm config omits optional dependencies, enable them and reinstall.');
  console.error('');
  console.error('To install:');
  console.error('  npm install -g lean-spec');
  console.error('');
  console.error('If you installed globally, try:');
  console.error('  npm uninstall -g lean-spec && npm install -g lean-spec');
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
  console.error('Failed to start lean-spec:', err.message);
  debug('Spawn error:', err);
  process.exit(1);
});
