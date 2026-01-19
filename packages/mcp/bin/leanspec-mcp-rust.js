#!/usr/bin/env node
/**
 * LeanSpec MCP Server Binary Wrapper
 * 
 * This script detects the current platform and architecture,
 * then spawns the appropriate Rust MCP binary.
 * 
 * The MCP server communicates via stdio using JSON-RPC.
 * 
 * The wrapper looks for binaries in the following locations:
 * 1. Platform-specific npm package (@leanspec/mcp-darwin-x64, etc.)
 * 2. Local binaries directory (for development)
 */

const { spawn } = require('child_process');
const path = require('path');

// Platform detection mapping
const PLATFORM_MAP = {
  darwin: { x64: 'darwin-x64', arm64: 'darwin-arm64' },
  linux: { x64: 'linux-x64' },
  win32: { x64: 'windows-x64', arm64: 'windows-arm64' }
};

function getBinaryPath() {
  const platform = process.platform;
  const arch = process.arch;
  
  const platformKey = PLATFORM_MAP[platform]?.[arch];
  if (!platformKey) {
    console.error(`Unsupported platform: ${platform}-${arch}`);
    console.error('Supported: macOS (x64/arm64), Linux (x64/arm64), Windows (x64)');
    process.exit(1);
  }

  const isWindows = platform === 'win32';
  const binaryName = isWindows ? 'leanspec-mcp.exe' : 'leanspec-mcp';
  const packageName = `@leanspec/mcp-${platformKey}`;

  // Try to resolve platform package
  try {
    return require.resolve(`${packageName}/${binaryName}`);
  } catch (e) {
    // Platform package not found
  }

  // Try local binaries directory (for development/testing)
  try {
    const localPath = path.join(__dirname, '..', 'binaries', platformKey, binaryName);
    require('fs').accessSync(localPath);
    return localPath;
  } catch (e) {
    // Local binary not found
  }

  console.error(`MCP binary not found for ${platform}-${arch}`);
  console.error(`Expected package: ${packageName}`);
  console.error('');
  console.error('To install:');
  console.error('  npm install -g @leanspec/mcp');
  console.error('');
  console.error('If you installed globally, try:');
  console.error('  npm uninstall -g @leanspec/mcp && npm install -g @leanspec/mcp');
  process.exit(1);
}

// Execute binary
const binaryPath = getBinaryPath();
const child = spawn(binaryPath, process.argv.slice(2), {
  stdio: 'inherit',
  windowsHide: true,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});

child.on('error', (err) => {
  console.error('Failed to start leanspec-mcp:', err.message);
  process.exit(1);
});
