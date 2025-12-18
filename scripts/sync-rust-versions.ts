#!/usr/bin/env tsx
/**
 * Sync versions for Rust binary platform packages
 * 
 * This script ensures all platform-specific binary packages use the same version 
 * as the root package.json. It updates:
 * - CLI platform packages (lean-spec-darwin-x64, etc.)
 * - MCP platform packages (@leanspec/mcp-darwin-x64, etc.)
 * 
 * Usage:
 *   pnpm sync-rust-versions [--dry-run]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

const PLATFORMS = ['darwin-x64', 'darwin-arm64', 'linux-x64', 'linux-arm64', 'windows-x64'];

interface PackageJson {
  name: string;
  version: string;
  optionalDependencies?: Record<string, string>;
  [key: string]: unknown;
}

async function readJsonFile(filePath: string): Promise<PackageJson> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function writeJsonFile(filePath: string, data: PackageJson): Promise<void> {
  const content = JSON.stringify(data, null, 2) + '\n';
  await fs.writeFile(filePath, content, 'utf-8');
}

async function syncRustVersions(dryRun: boolean = false): Promise<void> {
  console.log('🔄 Syncing Rust binary platform package versions...\n');

  // Read root package.json version
  const rootPackageJsonPath = path.join(ROOT_DIR, 'package.json');
  const rootPackage = await readJsonFile(rootPackageJsonPath);
  const targetVersion = rootPackage.version;

  console.log(`📦 Target version: ${targetVersion}\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Sync CLI platform packages
  console.log('📁 CLI Platform Packages:');
  for (const platform of PLATFORMS) {
    const packageJsonPath = path.join(PACKAGES_DIR, 'cli', 'binaries', platform, 'package.json');
    
    try {
      const pkg = await readJsonFile(packageJsonPath);
      const packageName = pkg.name;
      const currentVersion = pkg.version;

      if (currentVersion === targetVersion) {
        console.log(`  ✓ ${packageName}: ${currentVersion} (synced)`);
        skipped++;
      } else {
        console.log(`  ⚠ ${packageName}: ${currentVersion} → ${targetVersion}`);
        
        if (!dryRun) {
          pkg.version = targetVersion;
          await writeJsonFile(packageJsonPath, pkg);
        }
        updated++;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`  ℹ ${platform}: package.json not found (skipped)`);
      } else {
        console.error(`  ✗ ${platform}: ${error}`);
        errors++;
      }
    }
  }

  // Sync MCP platform packages
  console.log('\n📁 MCP Platform Packages:');
  for (const platform of PLATFORMS) {
    const packageJsonPath = path.join(PACKAGES_DIR, 'mcp', 'binaries', platform, 'package.json');
    
    try {
      const pkg = await readJsonFile(packageJsonPath);
      const packageName = pkg.name;
      const currentVersion = pkg.version;

      if (currentVersion === targetVersion) {
        console.log(`  ✓ ${packageName}: ${currentVersion} (synced)`);
        skipped++;
      } else {
        console.log(`  ⚠ ${packageName}: ${currentVersion} → ${targetVersion}`);
        
        if (!dryRun) {
          pkg.version = targetVersion;
          await writeJsonFile(packageJsonPath, pkg);
        }
        updated++;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`  ℹ ${platform}: package.json not found (skipped)`);
      } else {
        console.error(`  ✗ ${platform}: ${error}`);
        errors++;
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Summary:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Already synced: ${skipped}`);
  console.log(`  Errors: ${errors}`);
  
  if (dryRun && updated > 0) {
    console.log(`\n💡 Run without --dry-run to apply changes`);
  } else if (!dryRun && updated > 0) {
    console.log(`\n✅ Rust platform package version sync complete!`);
  } else if (updated === 0 && errors === 0) {
    console.log(`\n✅ All Rust platform packages already in sync!`);
  }

  if (errors > 0) {
    process.exit(1);
  }
}

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

syncRustVersions(dryRun).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
