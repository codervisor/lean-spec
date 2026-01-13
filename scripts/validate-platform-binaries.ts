#!/usr/bin/env tsx
/**
 * Validate that all platform binaries exist before publishing
 * 
 * This script checks that all required binaries for CLI and MCP
 * are present in the expected directories for all platforms.
 * 
 * Usage:
 *   tsx scripts/validate-platform-binaries.ts
 *   
 * Exit codes:
 *   0 - All binaries found
 *   1 - Missing binaries
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

const PLATFORMS = ['darwin-x64', 'darwin-arm64', 'linux-x64', 'linux-arm64', 'windows-x64'];

interface BinaryCheck {
  path: string;
  exists: boolean;
  size?: number;
}

async function checkBinary(binaryPath: string): Promise<BinaryCheck> {
  try {
    const stats = await fs.stat(binaryPath);
    return {
      path: binaryPath,
      exists: true,
      size: stats.size
    };
  } catch {
    return {
      path: binaryPath,
      exists: false
    };
  }
}

async function validatePlatformBinaries(): Promise<boolean> {
  console.log('🔍 Validating platform binaries...\n');

  const checks: BinaryCheck[] = [];
  let allValid = true;

  for (const platform of PLATFORMS) {
    const isWindows = platform.startsWith('windows');
    const cliExt = isWindows ? '.exe' : '';
    const mcpExt = isWindows ? '.exe' : '';

    // Check CLI binary
    const cliBinaryPath = path.join(
      PACKAGES_DIR,
      'cli',
      'binaries',
      platform,
      `lean-spec${cliExt}`
    );
    const cliCheck = await checkBinary(cliBinaryPath);
    checks.push(cliCheck);

    if (cliCheck.exists) {
      const sizeKB = ((cliCheck.size || 0) / 1024).toFixed(1);
      console.log(`✅ CLI ${platform}: ${sizeKB} KB`);
    } else {
      console.log(`❌ CLI ${platform}: MISSING`);
      allValid = false;
    }

    // Check MCP binary
    const mcpBinaryPath = path.join(
      PACKAGES_DIR,
      'mcp',
      'binaries',
      platform,
      `leanspec-mcp${mcpExt}`
    );
    const mcpCheck = await checkBinary(mcpBinaryPath);
    checks.push(mcpCheck);

    if (mcpCheck.exists) {
      const sizeKB = ((mcpCheck.size || 0) / 1024).toFixed(1);
      console.log(`✅ MCP ${platform}: ${sizeKB} KB`);
    } else {
      console.log(`❌ MCP ${platform}: MISSING`);
      allValid = false;
    }
  }

  console.log('');

  if (!allValid) {
    console.log('❌ ERROR: Missing platform binaries. Cannot publish.');
    console.log('\nMissing files:');
    for (const check of checks) {
      if (!check.exists) {
        console.log(`  - ${check.path}`);
      }
    }
    return false;
  }

  console.log('✅ All platform binaries validated successfully!');
  return true;
}

validatePlatformBinaries().then(valid => {
  process.exit(valid ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
