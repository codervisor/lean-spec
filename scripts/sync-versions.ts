#!/usr/bin/env tsx
/**
 * Sync versions across workspace packages
 * 
 * This script ensures all workspace packages use the same version as the root package.json.
 * It reads the version from the root package.json and updates all packages in the monorepo.
 * 
 * Usage:
 *   pnpm sync-versions [--dry-run]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

interface PackageJson {
  name: string;
  version: string;
  [key: string]: any;
}

async function readJsonFile(filePath: string): Promise<PackageJson> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function writeJsonFile(filePath: string, data: PackageJson): Promise<void> {
  const content = JSON.stringify(data, null, 2) + '\n';
  await fs.writeFile(filePath, content, 'utf-8');
}

async function getPackageDirs(): Promise<string[]> {
  const entries = await fs.readdir(PACKAGES_DIR, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(PACKAGES_DIR, entry.name));
}

async function syncVersions(dryRun: boolean = false): Promise<void> {
  console.log('🔄 Syncing workspace package versions...\n');

  // Read root package.json version
  const rootPackageJsonPath = path.join(ROOT_DIR, 'package.json');
  const rootPackage = await readJsonFile(rootPackageJsonPath);
  const targetVersion = rootPackage.version;

  console.log(`📦 Root version: ${targetVersion}\n`);

  // Get all package directories
  const packageDirs = await getPackageDirs();

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const packageDir of packageDirs) {
    const packageJsonPath = path.join(packageDir, 'package.json');
    
    try {
      const pkg = await readJsonFile(packageJsonPath);
      const packageName = pkg.name;
      const currentVersion = pkg.version;

      if (currentVersion === targetVersion) {
        console.log(`✓ ${packageName}: ${currentVersion} (already synced)`);
        skipped++;
      } else {
        console.log(`⚠ ${packageName}: ${currentVersion} → ${targetVersion}`);
        
        if (!dryRun) {
          pkg.version = targetVersion;
          await writeJsonFile(packageJsonPath, pkg);
          console.log(`  ✓ Updated`);
        } else {
          console.log(`  ℹ Would update (dry run)`);
        }
        updated++;
      }
    } catch (error) {
      console.error(`✗ Error processing ${path.basename(packageDir)}:`, error);
      errors++;
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
    console.log(`\n✅ Version sync complete!`);
  } else if (updated === 0 && errors === 0) {
    console.log(`\n✅ All packages already in sync!`);
  }

  if (errors > 0) {
    process.exit(1);
  }
}

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

syncVersions(dryRun).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
