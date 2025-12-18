#!/usr/bin/env tsx
/**
 * Publish platform packages for Rust binaries
 * 
 * This script publishes all platform-specific binary packages to npm.
 * Platform packages MUST be published before the main packages.
 * 
 * Prerequisites:
 * - Rust binaries must be built and placed in the binaries directories
 * - Version must be synced with sync-rust-versions.ts
 * - Must be logged in to npm (npm login)
 * 
 * Usage:
 *   pnpm publish:platforms [--dry-run]
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

const PLATFORMS = ['darwin-x64', 'darwin-arm64', 'linux-x64', 'linux-arm64', 'windows-x64'];

interface PublishResult {
  package: string;
  success: boolean;
  error?: string;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function publishPackage(packageDir: string, dryRun: boolean): Promise<PublishResult> {
  const packageJsonPath = path.join(packageDir, 'package.json');
  
  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    const packageName = packageJson.name;

    // Check if binary exists
    const binaryName = packageJson.main;
    const binaryPath = path.join(packageDir, binaryName);
    
    if (!(await fileExists(binaryPath))) {
      return {
        package: packageName,
        success: false,
        error: `Binary not found: ${binaryName}`
      };
    }

    // Publish
    const command = dryRun 
      ? 'npm publish --dry-run --access public'
      : 'npm publish --access public';
    
    console.log(`  📦 Publishing ${packageName}...`);
    execSync(command, { cwd: packageDir, stdio: 'pipe' });
    
    return { package: packageName, success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      package: packageDir,
      success: false,
      error: message
    };
  }
}

async function publishPlatformPackages(dryRun: boolean): Promise<void> {
  console.log('📤 Publishing platform packages...\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN - No packages will be published\n');
  }

  const results: PublishResult[] = [];

  // Publish CLI platform packages
  console.log('📁 CLI Platform Packages:');
  for (const platform of PLATFORMS) {
    const packageDir = path.join(PACKAGES_DIR, 'cli', 'binaries', platform);
    const result = await publishPackage(packageDir, dryRun);
    results.push(result);
    
    if (result.success) {
      console.log(`  ✓ ${result.package}`);
    } else {
      console.log(`  ✗ ${result.package}: ${result.error}`);
    }
  }

  // Publish MCP platform packages
  console.log('\n📁 MCP Platform Packages:');
  for (const platform of PLATFORMS) {
    const packageDir = path.join(PACKAGES_DIR, 'mcp', 'binaries', platform);
    const result = await publishPackage(packageDir, dryRun);
    results.push(result);
    
    if (result.success) {
      console.log(`  ✓ ${result.package}`);
    } else {
      console.log(`  ✗ ${result.package}: ${result.error}`);
    }
  }

  // Summary
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n${'='.repeat(50)}`);
  console.log('Summary:');
  console.log(`  Published: ${successful.length}`);
  console.log(`  Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\n❌ Failed packages:');
    for (const result of failed) {
      console.log(`  - ${result.package}: ${result.error}`);
    }
    process.exit(1);
  }

  if (!dryRun && successful.length > 0) {
    console.log('\n✅ Platform packages published successfully!');
    console.log('\n📝 Next step: Publish main packages with:');
    console.log('   pnpm publish:main');
  }
}

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

publishPlatformPackages(dryRun).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
