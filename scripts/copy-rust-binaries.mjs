#!/usr/bin/env node
/**
 * copy-rust-binaries.mjs
 * 
 * Copies Rust binaries from rust/target/release to packages/{cli,mcp}/binaries/{platform}/
 * Automatically detects current platform and copies the appropriate binary.
 * 
 * Usage:
 *   node scripts/copy-rust-binaries.mjs           # Copy current platform
 *   node scripts/copy-rust-binaries.mjs --all     # Copy all platforms (requires cross-compilation)
 */
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Platform mapping
const PLATFORM_MAP = {
  linux: { x64: 'linux-x64', arm64: 'linux-arm64' },
  darwin: { x64: 'darwin-x64', arm64: 'darwin-arm64' },
  win32: { x64: 'windows-x64', arm64: 'windows-arm64' }
};

// All platforms for --all flag
const ALL_PLATFORMS = [
  'darwin-x64',
  'darwin-arm64',
  'linux-x64',
  'linux-arm64',
  'windows-x64',
];

function getCurrentPlatform() {
  const platform = process.platform;
  const arch = process.arch;
  const platformKey = PLATFORM_MAP[platform]?.[arch];
  
  if (!platformKey) {
    throw new Error(`Unsupported platform: ${platform}-${arch}`);
  }
  
  return platformKey;
}

async function killProcessesUsingBinary(binaryPath) {
  if (process.platform === 'win32') {
    // Windows: use handle.exe or just try to copy
    return;
  }
  
  try {
    // Use lsof to find processes using the binary
    const { execSync } = await import('node:child_process');
    const output = execSync(`lsof "${binaryPath}" 2>/dev/null || true`, { encoding: 'utf-8' });
    
    if (!output.trim()) {
      return; // No processes using the file
    }
    
    // Extract PIDs (skip header line)
    const lines = output.trim().split('\n').slice(1);
    const pids = [...new Set(lines.map(line => line.split(/\s+/)[1]).filter(Boolean))];
    
    if (pids.length > 0) {
      console.log(`⚠️  Found ${pids.length} process(es) using ${path.basename(binaryPath)}, stopping them...`);
      for (const pid of pids) {
        try {
          execSync(`kill ${pid}`, { stdio: 'ignore' });
        } catch (e) {
          // Process might already be dead
        }
      }
      // Give processes time to exit
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (e) {
    // lsof not available or other error, continue anyway
  }
}

async function copyBinary(binaryName, platformKey) {
  const isWindows = platformKey.startsWith('windows-');
  const sourceExt = isWindows ? '.exe' : '';
  const sourcePath = path.join(ROOT, 'rust', 'target', 'release', `${binaryName}${sourceExt}`);
  
  // Determine destination based on binary name
  const packagePath = binaryName === 'lean-spec' ? 'cli' : 'mcp';
  const destDir = path.join(ROOT, 'packages', packagePath, 'binaries', platformKey);
  const destPath = path.join(destDir, binaryName + sourceExt);
  
  // Check if source exists
  try {
    await fs.access(sourcePath);
  } catch (e) {
    console.warn(`⚠️  Source binary not found: ${sourcePath}`);
    return false;
  }
  
  // Ensure destination directory exists
  await fs.mkdir(destDir, { recursive: true });
  
  // Kill any processes using the destination binary
  try {
    await fs.access(destPath);
    await killProcessesUsingBinary(destPath);
  } catch (e) {
    // Destination doesn't exist yet, that's fine
  }
  
  // Copy binary
  await fs.copyFile(sourcePath, destPath);
  
  // Make executable on Unix
  if (!isWindows) {
    await fs.chmod(destPath, 0o755);
  }
  
  console.log(`✅ Copied ${binaryName} to ${packagePath}/binaries/${platformKey}/`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const copyAll = args.includes('--all');
  
  console.log('🔧 Copying Rust binaries...\n');
  
  const binaries = ['lean-spec', 'leanspec-mcp'];
  
  if (copyAll) {
    console.log('📦 Copying all platforms (requires cross-compiled binaries)\n');
    
    for (const platformKey of ALL_PLATFORMS) {
      console.log(`\nPlatform: ${platformKey}`);
      for (const binary of binaries) {
        await copyBinary(binary, platformKey);
      }
    }
  } else {
    const currentPlatform = getCurrentPlatform();
    console.log(`📦 Copying for current platform: ${currentPlatform}\n`);
    
    for (const binary of binaries) {
      await copyBinary(binary, currentPlatform);
    }
  }
  
  console.log('\n✨ Done!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
