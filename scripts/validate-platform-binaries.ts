#!/usr/bin/env tsx
/**
 * Validate that all platform binaries exist before publishing
 * 
 * This script checks that all required binaries for CLI, MCP, and HTTP server
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

const PLATFORMS = ['darwin-x64', 'darwin-arm64', 'linux-x64', 'windows-x64'];

interface BinaryCheck {
  path: string;
  exists: boolean;
  size?: number;
  headerValid?: boolean;
}

const MACHO_MAGICS = new Set([
  0xfeedface,
  0xfeedfacf,
  0xcefaedfe,
  0xcffaedfe,
  0xcafebabe,
  0xbebafeca,
]);

async function readHeaderBytes(binaryPath: string): Promise<Buffer | null> {
  try {
    const handle = await fs.open(binaryPath, 'r');
    try {
      const buffer = Buffer.alloc(4);
      const { bytesRead } = await handle.read(buffer, 0, 4, 0);
      return bytesRead === 4 ? buffer : null;
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}

function isValidBinaryHeader(header: Buffer | null, platformKey: string): boolean {
  if (!header) return false;

  if (platformKey.startsWith('linux-')) {
    return header[0] === 0x7f && header[1] === 0x45 && header[2] === 0x4c && header[3] === 0x46;
  }

  if (platformKey.startsWith('windows-')) {
    return header[0] === 0x4d && header[1] === 0x5a;
  }

  if (platformKey.startsWith('darwin-')) {
    const magicBE = header.readUInt32BE(0);
    const magicLE = header.readUInt32LE(0);
    return MACHO_MAGICS.has(magicBE) || MACHO_MAGICS.has(magicLE);
  }

  return false;
}

async function checkBinary(binaryPath: string, platformKey: string): Promise<BinaryCheck> {
  try {
    const stats = await fs.stat(binaryPath);
    const header = await readHeaderBytes(binaryPath);
    return {
      path: binaryPath,
      exists: true,
      size: stats.size,
      headerValid: isValidBinaryHeader(header, platformKey)
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
    const httpExt = isWindows ? '.exe' : '';

    // Check CLI binary
    const cliBinaryPath = path.join(
      PACKAGES_DIR,
      'cli',
      'binaries',
      platform,
      `lean-spec${cliExt}`
    );
    const cliCheck = await checkBinary(cliBinaryPath, platform);
    checks.push(cliCheck);

    if (cliCheck.exists && cliCheck.headerValid) {
      const sizeKB = ((cliCheck.size || 0) / 1024).toFixed(1);
      console.log(`✅ CLI ${platform}: ${sizeKB} KB`);
    } else {
      const reason = cliCheck.exists ? 'INVALID HEADER' : 'MISSING';
      console.log(`❌ CLI ${platform}: ${reason}`);
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
    const mcpCheck = await checkBinary(mcpBinaryPath, platform);
    checks.push(mcpCheck);

    if (mcpCheck.exists && mcpCheck.headerValid) {
      const sizeKB = ((mcpCheck.size || 0) / 1024).toFixed(1);
      console.log(`✅ MCP ${platform}: ${sizeKB} KB`);
    } else {
      const reason = mcpCheck.exists ? 'INVALID HEADER' : 'MISSING';
      console.log(`❌ MCP ${platform}: ${reason}`);
      allValid = false;
    }

    // Check HTTP server binary
    const httpBinaryPath = path.join(
      PACKAGES_DIR,
      'http-server',
      'binaries',
      platform,
      `leanspec-http${httpExt}`
    );
    const httpCheck = await checkBinary(httpBinaryPath, platform);
    checks.push(httpCheck);

    if (httpCheck.exists && httpCheck.headerValid) {
      const sizeKB = ((httpCheck.size || 0) / 1024).toFixed(1);
      console.log(`✅ HTTP ${platform}: ${sizeKB} KB`);
    } else {
      const reason = httpCheck.exists ? 'INVALID HEADER' : 'MISSING';
      console.log(`❌ HTTP ${platform}: ${reason}`);
      allValid = false;
    }
  }

  console.log('');

  if (!allValid) {
    console.log('❌ ERROR: Missing platform binaries. Cannot publish.');
    console.log('\nMissing files:');
    for (const check of checks) {
      if (!check.exists || !check.headerValid) {
        const suffix = check.exists ? ' (invalid header)' : '';
        console.log(`  - ${check.path}${suffix}`);
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
