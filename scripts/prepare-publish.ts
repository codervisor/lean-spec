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
 * 4. Copies root README.md to CLI package for npm display
 * 5. After publish, restore original package.json files
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
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
  optionalDependencies?: Record<string, string>;
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
    '@leanspec/http-server': 'packages/http-server/package.json',
    '@leanspec/ui-components': 'packages/ui-components/package.json',
    '@leanspec/ui': 'packages/ui/package.json',
    '@leanspec/mcp': 'packages/mcp/package.json',
    'lean-spec': 'packages/cli/package.json',
    // HTTP server platform packages
    '@leanspec/http-darwin-x64': 'packages/http-server/binaries/darwin-x64/package.json',
    '@leanspec/http-darwin-arm64': 'packages/http-server/binaries/darwin-arm64/package.json',
    '@leanspec/http-linux-x64': 'packages/http-server/binaries/linux-x64/package.json',
    '@leanspec/http-linux-arm64': 'packages/http-server/binaries/linux-arm64/package.json',
    '@leanspec/http-windows-x64': 'packages/http-server/binaries/windows-x64/package.json',
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
  changed = replaceWorkspaceDeps(pkg.optionalDependencies, 'optionalDependencies') || changed;

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
    'packages/cli/package.json',
    'packages/mcp/package.json',
    'packages/http-server/package.json',
    'packages/ui-components/package.json',
    'packages/ui/package.json',
  ];

  const modified: string[] = [];
  for (const pkg of packages) {
    if (processPackage(pkg)) {
      modified.push(pkg);
    }
  }

  // Copy root README.md to CLI package for npm display
  const rootReadme = join(ROOT, 'README.md');
  const cliReadme = join(ROOT, 'packages/cli/README.md');
  if (existsSync(rootReadme)) {
    copyFileSync(rootReadme, cliReadme);
    console.log('\n📄 Copied root README.md to packages/cli/README.md');
    modified.push('packages/cli/README.md');
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
