#!/usr/bin/env node
/**
 * Prepare packages for npm publish by replacing workspace:* dependencies with actual versions.
 * Run this script before publishing to ensure no workspace protocol leaks into npm.
 * 
 * Usage:
 *   npm run prepare-publish
 *   pnpm prepare-publish
 * 
 * This script:
 * 1. Finds all workspace:* dependencies in packages
 * 2. Resolves actual versions from local package.json files
 * 3. Creates temporary package.json files with resolved versions
 * 4. After publish, restore original package.json files
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

function readPackageJson(pkgPath: string): PackageJson {
  return JSON.parse(readFileSync(pkgPath, 'utf-8'));
}

function writePackageJson(pkgPath: string, pkg: PackageJson): void {
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

function resolveWorkspaceVersion(depName: string): string | null {
  // Map package names to their paths in the monorepo
  const pkgMap: Record<string, string> = {
    '@leanspec/core': 'packages/core/package.json',
    '@leanspec/ui': 'packages/ui/package.json',
    'lean-spec': 'packages/cli/package.json',
  };

  const pkgPath = pkgMap[depName];
  if (!pkgPath) {
    console.warn(`⚠️  Unknown workspace package: ${depName}`);
    return null;
  }

  const fullPath = join(ROOT, pkgPath);
  if (!existsSync(fullPath)) {
    console.warn(`⚠️  Package not found: ${fullPath}`);
    return null;
  }

  const pkg = readPackageJson(fullPath);
  return pkg.version;
}

function replaceWorkspaceDeps(deps: Record<string, string> | undefined, depType: string): boolean {
  if (!deps) return false;
  
  let changed = false;
  for (const [name, version] of Object.entries(deps)) {
    if (version.startsWith('workspace:')) {
      const resolvedVersion = resolveWorkspaceVersion(name);
      if (resolvedVersion) {
        deps[name] = `^${resolvedVersion}`;
        console.log(`  ✓ ${depType}.${name}: workspace:* → ^${resolvedVersion}`);
        changed = true;
      }
    }
  }
  return changed;
}

function processPackage(pkgPath: string): boolean {
  const fullPath = join(ROOT, pkgPath);
  if (!existsSync(fullPath)) {
    console.warn(`⚠️  Package not found: ${fullPath}`);
    return false;
  }

  const pkg = readPackageJson(fullPath);
  console.log(`\n📦 Processing ${pkg.name}...`);

  let changed = false;
  changed = replaceWorkspaceDeps(pkg.dependencies, 'dependencies') || changed;
  changed = replaceWorkspaceDeps(pkg.devDependencies, 'devDependencies') || changed;
  changed = replaceWorkspaceDeps(pkg.peerDependencies, 'peerDependencies') || changed;

  if (changed) {
    // Create backup
    const backupPath = fullPath + '.backup';
    writeFileSync(backupPath, readFileSync(fullPath, 'utf-8'));
    console.log(`  💾 Backup saved to ${pkgPath}.backup`);

    // Write updated package.json
    writePackageJson(fullPath, pkg);
    console.log(`  ✅ Updated ${pkgPath}`);
    return true;
  } else {
    console.log(`  ⏭️  No workspace:* dependencies found`);
    return false;
  }
}

function main() {
  console.log('🚀 Preparing packages for npm publish...\n');
  console.log('This will replace workspace:* with actual versions.\n');

  const packages = [
    'packages/core/package.json',
    'packages/cli/package.json',
    'packages/ui/package.json',
  ];

  const modified: string[] = [];
  for (const pkg of packages) {
    if (processPackage(pkg)) {
      modified.push(pkg);
    }
  }

  if (modified.length > 0) {
    console.log('\n✅ Preparation complete!');
    console.log('\nModified packages:');
    modified.forEach(pkg => console.log(`  - ${pkg}`));
    console.log('\n⚠️  IMPORTANT: After publishing, restore original files:');
    console.log('   npm run restore-packages');
    console.log('   OR manually: mv package.json.backup package.json');
  } else {
    console.log('\n✅ No workspace:* dependencies found. Ready to publish!');
  }
}

main();
