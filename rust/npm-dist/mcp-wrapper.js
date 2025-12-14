#!/usr/bin/env node
/**
 * LeanSpec MCP Server Binary Wrapper
 * 
 * This script detects the current platform and architecture,
 * then spawns the appropriate Rust MCP binary.
 * 
 * The MCP server communicates via stdio using JSON-RPC.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Detect platform and architecture
const platform = process.platform;
const arch = process.arch;

// Map platform/arch to binary name
function getBinaryName() {
  const platformMap = {
    'darwin': 'macos',
    'linux': 'linux',
    'win32': 'windows'
  };
  
  const archMap = {
    'x64': 'x64',
    'arm64': 'arm64'
  };
  
  const os = platformMap[platform];
  const cpu = archMap[arch];
  
  if (!os || !cpu) {
    throw new Error(`Unsupported platform: ${platform}-${arch}`);
  }
  
  const ext = platform === 'win32' ? '.exe' : '';
  return `leanspec-mcp-${os}-${cpu}${ext}`;
}

// Find the binary
function findBinary() {
  const binaryName = getBinaryName();
  
  // Try platform-specific package first
  const platformPkg = `@leanspec/${platform}-${arch}`;
  try {
    const pkgPath = require.resolve(`${platformPkg}/bin/${binaryName}`);
    return pkgPath;
  } catch {
    // Fall through to local binaries
  }
  
  // Try local binaries directory
  const localBinary = path.join(__dirname, '..', 'binaries', binaryName);
  if (fs.existsSync(localBinary)) {
    return localBinary;
  }
  
  throw new Error(
    `Could not find LeanSpec MCP binary for ${platform}-${arch}.\n` +
    `Please ensure the platform-specific package is installed:\n` +
    `  npm install ${platformPkg}`
  );
}

// Main
try {
  const binaryPath = findBinary();
  
  // Spawn the binary with stdio for MCP communication
  const child = spawn(binaryPath, process.argv.slice(2), {
    stdio: 'inherit',
    env: {
      ...process.env,
      LEANSPEC_SPECS_DIR: process.env.LEANSPEC_SPECS_DIR || 'specs'
    }
  });
  
  child.on('error', (err) => {
    console.error(`Failed to start LeanSpec MCP: ${err.message}`);
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
  
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
