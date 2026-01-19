#!/usr/bin/env tsx
/**
 * Add platform-specific optional dependencies to parent package.json files.
 * 
 * This script runs AFTER generate-platform-manifests.ts and BEFORE prepare-publish.ts
 * to add workspace:* references to the platform packages.
 * 
 * Usage:
 *   tsx scripts/add-platform-deps.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const PLATFORMS = ['darwin-x64', 'darwin-arm64', 'linux-x64', 'windows-x64'];

interface PackageConfig {
  packagePath: string;
  packagePrefix: string;
}

const PACKAGES: PackageConfig[] = [
  { packagePath: 'packages/cli', packagePrefix: '@leanspec/cli' },
  { packagePath: 'packages/mcp', packagePrefix: '@leanspec/mcp' },
  { packagePath: 'packages/http-server', packagePrefix: '@leanspec/http' },
];

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  [key: string]: unknown;
}

async function addPlatformDeps(config: PackageConfig): Promise<void> {
  const pkgPath = path.join(ROOT, config.packagePath, 'package.json');
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8')) as PackageJson;

  console.log(`\n📦 Processing ${pkg.name}...`);

  // Check which platform packages exist
  const optionalDeps: Record<string, string> = {};
  let foundCount = 0;

  for (const platform of PLATFORMS) {
    const platformPkgPath = path.join(ROOT, config.packagePath, 'binaries', platform, 'package.json');
    try {
      await fs.access(platformPkgPath);
      const platformPkg = `${config.packagePrefix}-${platform}`;
      optionalDeps[platformPkg] = 'workspace:*';
      foundCount++;
      console.log(`  ✓ Found ${platformPkg}`);
    } catch (e) {
      // Platform package doesn't exist, skip it
    }
  }

  if (foundCount === 0) {
    console.log(`  ⏭️  No platform packages found`);
    return;
  }

  // Add optionalDependencies
  pkg.optionalDependencies = optionalDeps;

  // Write back to file
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  ✅ Added ${foundCount} platform dependencies`);
}

async function main() {
  console.log('🔗 Adding platform-specific optional dependencies...\n');

  for (const config of PACKAGES) {
    try {
      await addPlatformDeps(config);
    } catch (error) {
      console.error(`  ✗ Failed to process ${config.packagePath}:`, error);
    }
  }

  console.log('\n✅ Platform dependencies added successfully');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
