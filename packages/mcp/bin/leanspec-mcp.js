#!/usr/bin/env node
/**
 * LeanSpec MCP Server Wrapper
 *
 * Spawns the platform-specific Rust `leanspec-mcp` binary and pipes stdio
 * through unchanged. The binary speaks MCP over stdin/stdout, so this
 * wrapper only handles binary discovery — no protocol translation.
 *
 * Discovery order:
 *   1. rust/target/{debug,release}/leanspec-mcp (local dev)
 *   2. @leanspec/mcp-<platform>/leanspec-mcp    (npm platform package)
 *   3. ./binaries/<platform>/leanspec-mcp       (local binaries fallback)
 */

import { spawn } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { accessSync, openSync, readSync, closeSync } from 'fs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEBUG = process.env.LEANSPEC_DEBUG === '1';
const debug = (...args) => DEBUG && console.error('[leanspec-mcp debug]', ...args);

const PLATFORM_MAP = {
  darwin: { x64: 'darwin-x64', arm64: 'darwin-arm64' },
  linux: { x64: 'linux-x64' },
  win32: { x64: 'windows-x64' },
};

const MACHO_MAGICS = new Set([
  0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe, 0xcafebabe, 0xbebafeca,
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
    console.error('Supported: macOS (x64/arm64), Linux (x64), Windows (x64)');
    process.exit(1);
  }

  const isWindows = platform === 'win32';
  const binaryName = isWindows ? 'leanspec-mcp.exe' : 'leanspec-mcp';
  const packageName = `@leanspec/mcp-${platformKey}`;

  // 1. Local Rust build (dev workflow).
  for (const targetDir of ['debug', 'release']) {
    try {
      const rustPath = join(__dirname, '..', '..', '..', 'rust', 'target', targetDir, binaryName);
      debug(`Trying rust ${targetDir} binary:`, rustPath);
      accessSync(rustPath);
      if (isExecutableBinary(rustPath, platform)) {
        debug(`Found rust ${targetDir} binary:`, rustPath);
        return rustPath;
      }
    } catch (e) {
      debug(`Rust ${targetDir} binary not found:`, e.message);
    }
  }

  // 2. Platform npm package shared with the CLI distribution.
  try {
    const resolvedPath = require.resolve(`${packageName}/${binaryName}`);
    if (isExecutableBinary(resolvedPath, platform)) {
      debug('Found platform package binary:', resolvedPath);
      return resolvedPath;
    }
  } catch (e) {
    debug('Platform package not found:', packageName, '-', e.message);
  }

  // 3. Local binaries directory populated by scripts/copy-rust-binaries.mjs.
  try {
    const localPath = join(__dirname, '..', 'binaries', platformKey, binaryName);
    debug('Trying local binaries path:', localPath);
    accessSync(localPath);
    if (isExecutableBinary(localPath, platform)) {
      debug('Found local binary:', localPath);
      return localPath;
    }
  } catch (e) {
    debug('Local binary not found:', e.message);
  }

  console.error(`leanspec-mcp binary not found for ${platform}-${arch}`);
  console.error('');
  console.error('Install the LeanSpec CLI to get the MCP binary:');
  console.error('  npm install -g leanspec');
  console.error('');
  console.error('Or run from a checkout: `cargo build -p leanspec-mcp --release`.');
  process.exit(1);
}

const binaryPath = getBinaryPath();
const args = process.argv.slice(2);
debug('Spawning binary:', binaryPath);

const child = spawn(binaryPath, args, {
  stdio: 'inherit',
  windowsHide: true,
});

child.on('exit', (code, signal) => {
  debug('Binary exited:', { code, signal });
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on('error', (err) => {
  console.error('Failed to start leanspec-mcp:', err.message);
  debug('Spawn error:', err);
  process.exit(1);
});

const forwardSignal = (sig) => {
  try {
    child.kill(sig);
  } catch (e) {
    debug('Signal forward failed:', e.message);
  }
};
process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));
