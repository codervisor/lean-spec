#!/usr/bin/env tsx
/**
 * Publish main packages (leanspec and @leanspec/mcp)
 * 
 * This script publishes the main CLI and MCP packages that have 
 * optional dependencies on the platform-specific binary packages.
 * 
 * IMPORTANT: Run publish-platform-packages.ts FIRST!
 * Platform packages must be available on npm before publishing main packages.
 * 
 * ⚠️  IMPORTANT: This script should ONLY be run in CI/CD!
 * 
 * Usage:
 *   tsx scripts/publish-main-packages.ts [--dry-run] [--tag <tag>] [--allow-local]
 *   
 * Options:
 *   --dry-run      Run without actually publishing
 *   --tag <tag>    Publish with a dist-tag (e.g., dev, beta, next)
 *   --allow-local  Override CI-only check (use with caution)
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

function checkCIEnvironment(allowLocal: boolean): void {
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

  if (!isCI && !allowLocal) {
    console.error('❌ ERROR: This script should only be run in CI/CD!');
    console.error('');
    console.error('Publishing should happen through the GitHub Actions workflow.');
    console.error('This ensures platform packages are properly published first.');
    console.error('');
    console.error('If you absolutely must publish locally (not recommended):');
    console.error('  tsx scripts/publish-main-packages.ts --allow-local');
    console.error('');
    console.error('Recommended: Use the GitHub Actions workflow instead:');
    console.error('  gh workflow run publish.yml');
    process.exit(1);
  }

  if (!isCI && allowLocal) {
    console.warn('⚠️  WARNING: Running in local mode (--allow-local)');
    console.warn('');
  }
}

interface PublishResult {
  package: string;
  success: boolean;
  error?: string;
}

async function publishPackage(packageDir: string, dryRun: boolean, tag?: string): Promise<PublishResult> {
  const packageJsonPath = path.join(packageDir, 'package.json');

  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    const packageName = packageJson.name;

    // Build publish command
    let command = 'npm publish --access public';
    if (tag) {
      command += ` --tag ${tag}`;
    }
    if (dryRun) {
      command += ' --dry-run';
    }

    console.log(`  📦 Publishing ${packageName}${tag ? ` (tag: ${tag})` : ''}...`);

    try {
      execSync(command, { cwd: packageDir, stdio: 'pipe' });
    } catch (error) {
      // Check if it's a "cannot publish over existing version" error
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('You cannot publish over the previously published versions')) {
        console.log(`  ⚠️  ${packageName} already published (skipped)`);
        return { package: packageName, success: true };
      }
      throw error;
    }

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
    '@leanspec/cli-darwin-arm64',
    '@leanspec/cli-linux-x64',
    '@leanspec/mcp-darwin-arm64',
    '@leanspec/mcp-linux-x64',
    '@leanspec/http-darwin-arm64',
    '@leanspec/http-linux-x64',
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

async function publishMainPackages(dryRun: boolean, tag?: string): Promise<void> {
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

  const cliResult = await publishPackage(path.join(PACKAGES_DIR, 'cli'), dryRun, tag);
  results.push(cliResult);
  if (cliResult.success) {
    console.log(`  ✓ ${cliResult.package}`);
  } else {
    console.log(`  ✗ ${cliResult.package}: ${cliResult.error}`);
  }

  const mcpResult = await publishPackage(path.join(PACKAGES_DIR, 'mcp'), dryRun, tag);
  results.push(mcpResult);
  if (mcpResult.success) {
    console.log(`  ✓ ${mcpResult.package}`);
  } else {
    console.log(`  ✗ ${mcpResult.package}: ${mcpResult.error}`);
  }

  const httpServerResult = await publishPackage(path.join(PACKAGES_DIR, 'http-server'), dryRun, tag);
  results.push(httpServerResult);
  if (httpServerResult.success) {
    console.log(`  ✓ ${httpServerResult.package}`);
  } else {
    console.log(`  ✗ ${httpServerResult.package}: ${httpServerResult.error}`);
  }

  const uiResult = await publishPackage(path.join(PACKAGES_DIR, 'ui'), dryRun, tag);
  results.push(uiResult);
  if (uiResult.success) {
    console.log(`  ✓ ${uiResult.package}`);
  } else {
    console.log(`  ✗ ${uiResult.package}: ${uiResult.error}`);
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
    console.log('   npm install -g leanspec');
    console.log('   npm install -g @leanspec/mcp');
  }
}

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const allowLocal = args.includes('--allow-local');

// Check CI environment before proceeding
checkCIEnvironment(allowLocal);

let tag: string | undefined;
const tagIndex = args.indexOf('--tag');
if (tagIndex !== -1 && args[tagIndex + 1]) {
  tag = args[tagIndex + 1];
}

publishMainPackages(dryRun, tag).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
