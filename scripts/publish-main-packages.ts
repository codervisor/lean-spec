#!/usr/bin/env tsx
/**
 * Publish main packages (lean-spec and @leanspec/mcp)
 * 
 * This script publishes the main CLI and MCP packages that have 
 * optional dependencies on the platform-specific binary packages.
 * 
 * IMPORTANT: Run publish-platform-packages.ts FIRST!
 * Platform packages must be available on npm before publishing main packages.
 * 
 * Usage:
 *   pnpm publish:main [--dry-run]
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

interface PublishResult {
  package: string;
  success: boolean;
  error?: string;
}

async function publishPackage(packageDir: string, dryRun: boolean): Promise<PublishResult> {
  const packageJsonPath = path.join(packageDir, 'package.json');
  
  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    const packageName = packageJson.name;

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

async function verifyPlatformPackages(): Promise<boolean> {
  console.log('🔍 Verifying platform packages are published...\n');
  
  // Check a subset of platform packages to verify they're available
  const packagesToCheck = [
    'lean-spec-darwin-arm64',
    'lean-spec-linux-x64',
  ];

  for (const pkg of packagesToCheck) {
    try {
      execSync(`npm view ${pkg} version`, { stdio: 'pipe' });
      console.log(`  ✓ ${pkg} available on npm`);
    } catch {
      console.log(`  ✗ ${pkg} not found on npm`);
      console.log('\n❌ Platform packages must be published first!');
      console.log('   Run: pnpm publish:platforms');
      return false;
    }
  }
  
  console.log('');
  return true;
}

async function publishMainPackages(dryRun: boolean): Promise<void> {
  console.log('📤 Publishing main packages...\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN - No packages will be published\n');
  } else {
    // Verify platform packages are published (skip for dry run)
    const verified = await verifyPlatformPackages();
    if (!verified) {
      process.exit(1);
    }
  }

  const results: PublishResult[] = [];

  // Publish main CLI package
  console.log('📁 Main Packages:');
  
  const cliResult = await publishPackage(path.join(PACKAGES_DIR, 'cli'), dryRun);
  results.push(cliResult);
  if (cliResult.success) {
    console.log(`  ✓ ${cliResult.package}`);
  } else {
    console.log(`  ✗ ${cliResult.package}: ${cliResult.error}`);
  }

  const mcpResult = await publishPackage(path.join(PACKAGES_DIR, 'mcp'), dryRun);
  results.push(mcpResult);
  if (mcpResult.success) {
    console.log(`  ✓ ${mcpResult.package}`);
  } else {
    console.log(`  ✗ ${mcpResult.package}: ${mcpResult.error}`);
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
    console.log('\n✅ Main packages published successfully!');
    console.log('\n🎉 Release complete! Users can now install with:');
    console.log('   npm install -g lean-spec');
    console.log('   npm install -g @leanspec/mcp');
  }
}

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

publishMainPackages(dryRun).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
