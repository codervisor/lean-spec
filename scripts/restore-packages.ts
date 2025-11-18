#!/usr/bin/env node
/**
 * Restore original package.json files after publishing.
 * This reverts the changes made by prepare-publish.ts
 * 
 * Usage:
 *   npm run restore-packages
 *   pnpm restore-packages
 */

import { existsSync, renameSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

function restorePackage(pkgPath: string): boolean {
  const fullPath = join(ROOT, pkgPath);
  const backupPath = fullPath + '.backup';

  if (!existsSync(backupPath)) {
    console.log(`⏭️  No backup found for ${pkgPath}`);
    return false;
  }

  console.log(`📦 Restoring ${pkgPath}...`);
  
  // Replace current with backup
  renameSync(backupPath, fullPath);
  console.log(`  ✅ Restored from backup`);
  
  return true;
}

function main() {
  console.log('🔄 Restoring original package.json files...\n');

  const packages = [
    'packages/core/package.json',
    'packages/cli/package.json',
    'packages/ui/package.json',
  ];

  let restored = 0;
  for (const pkg of packages) {
    if (restorePackage(pkg)) {
      restored++;
    }
  }

  if (restored > 0) {
    console.log(`\n✅ Restored ${restored} package(s)`);
  } else {
    console.log('\n⚠️  No backups found. Nothing to restore.');
  }
}

main();
