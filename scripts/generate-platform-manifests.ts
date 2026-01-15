#!/usr/bin/env tsx
/**
 * Generate package.json and postinstall.js for platform-specific binary packages.
 * 
 * This script ensures platform packages have the necessary files to:
 * 1. Set executable permissions on binaries after npm install (postinstall.js)
 * 2. Include all required files in published package (package.json with files array)
 * 
 * Usage:
 *   tsx scripts/generate-platform-manifests.ts
 *   
 * This script should run AFTER binaries are copied to platform directories,
 * but BEFORE publishing to npm.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const PLATFORMS = ['darwin-x64', 'darwin-arm64', 'linux-x64', 'linux-arm64', 'windows-x64'];

interface BinaryConfig {
  packagePrefix: string;
  description: string;
  packagePath: string;
}

const BINARY_CONFIG: Record<string, BinaryConfig> = {
  'lean-spec': {
    packagePrefix: '@leanspec/cli',
    description: 'LeanSpec CLI',
    packagePath: 'cli',
  },
  'leanspec-mcp': {
    packagePrefix: '@leanspec/mcp',
    description: 'LeanSpec MCP Server',
    packagePath: 'mcp',
  },
  'leanspec-http': {
    packagePrefix: '@leanspec/http',
    description: 'LeanSpec HTTP Server',
    packagePath: 'http-server',
  },
};

interface PlatformInfo {
  label: string;
  os: string;
  cpu: string;
}

function getPlatformInfo(platformKey: string): PlatformInfo {
  const [os, arch] = platformKey.split('-');
  const osMap: Record<string, string> = { darwin: 'macOS', linux: 'Linux', windows: 'Windows' };
  const archMap: Record<string, string> = { x64: 'x64', arm64: 'ARM64' };
  return {
    label: `${osMap[os] || os} ${archMap[arch] || arch}`,
    os: os === 'windows' ? 'win32' : os,
    cpu: arch,
  };
}

function getBinaryFileName(binaryName: string, platformKey: string): string {
  const isWindows = platformKey.startsWith('windows-');
  return isWindows ? `${binaryName}.exe` : binaryName;
}

async function resolveTargetVersion(): Promise<string> {
  const rootPkgPath = path.join(ROOT, 'package.json');
  const rootPkg = JSON.parse(await fs.readFile(rootPkgPath, 'utf-8'));
  return rootPkg.version;
}

async function generateManifests(
  binaryName: string,
  platformKey: string,
  version: string
): Promise<void> {
  const config = BINARY_CONFIG[binaryName];
  if (!config) {
    throw new Error(`Unknown binary: ${binaryName}`);
  }

  const isWindows = platformKey.startsWith('windows-');
  const binaryFileName = getBinaryFileName(binaryName, platformKey);
  const platformInfo = getPlatformInfo(platformKey);
  const packageName = `${config.packagePrefix}-${platformKey}`;

  const destDir = path.join(ROOT, 'packages', config.packagePath, 'binaries', platformKey);
  const packageJsonPath = path.join(destDir, 'package.json');
  const postinstallPath = path.join(destDir, 'postinstall.js');
  const binaryPath = path.join(destDir, binaryFileName);

  // Check if binary exists
  try {
    await fs.access(binaryPath);
  } catch (e) {
    console.warn(`⚠️  Binary not found: ${binaryPath}, skipping manifest generation`);
    return;
  }

  // Generate package.json
  const packageJson = {
    name: packageName,
    version,
    description: `${config.description} binary for ${platformInfo.label}`,
    os: [platformInfo.os],
    cpu: [platformInfo.cpu],
    main: binaryFileName,
    files: [binaryFileName, 'postinstall.js'],
    scripts: {
      postinstall: 'node postinstall.js',
    },
    repository: {
      type: 'git',
      url: 'https://github.com/codervisor/lean-spec.git',
    },
    license: 'MIT',
  };

  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  // Generate postinstall.js
  const postinstallContent = isWindows
    ? `#!/usr/bin/env node
/**
 * Postinstall script - no-op on Windows (permissions not needed).
 * This file exists for consistency across all platform packages.
 */
console.log('✓ ${binaryFileName} ready');
`
    : `#!/usr/bin/env node
/**
 * Postinstall script to set execute permissions on the binary.
 * npm doesn't preserve file permissions, so we need to set them after install.
 */
const { chmodSync } = require('fs');
const { join } = require('path');

const binaryPath = join(__dirname, '${binaryFileName}');

try {
  chmodSync(binaryPath, 0o755);
  console.log('✓ Set execute permissions on ${binaryFileName} binary');
} catch (err) {
  console.error('Warning: Could not set execute permissions:', err.message);
  // Don't fail the install
}
`;

  await fs.writeFile(postinstallPath, postinstallContent);

  console.log(`  ✓ Generated manifests for ${packageName}`);
}

async function main() {
  console.log('📝 Generating platform package manifests...\n');

  const version = await resolveTargetVersion();
  console.log(`Version: ${version}\n`);

  const binaries = ['lean-spec', 'leanspec-mcp', 'leanspec-http'];

  for (const platformKey of PLATFORMS) {
    console.log(`Platform: ${platformKey}`);
    for (const binary of binaries) {
      try {
        await generateManifests(binary, platformKey, version);
      } catch (error) {
        console.error(`  ✗ Failed to generate manifests for ${binary}:`, error);
      }
    }
    console.log('');
  }

  console.log('✅ Manifest generation complete');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
