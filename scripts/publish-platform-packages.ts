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
 *   tsx scripts/publish-platform-packages.ts [--dry-run] [--tag <tag>]
 *   
 * Options:
 *   --dry-run    Run without actually publishing
 *   --tag <tag>  Publish with a dist-tag (e.g., dev, beta, next)
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
  type?: string;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function publishPackage(packageDir: string, dryRun: boolean, tag?: string): Promise<PublishResult> {
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

async function publishPlatformPackages(dryRun: boolean, tag?: string): Promise<void> {
  console.log('📤 Publishing platform packages...\n');

  if (dryRun) {
    console.log('🔍 DRY RUN - No packages will be published\n');
  }

  // Collect all package directories to publish
  const packagesToPublish: Array<{ type: string; dir: string }> = [];

  // CLI platform packages
  for (const platform of PLATFORMS) {
    packagesToPublish.push({
      type: 'CLI',
      dir: path.join(PACKAGES_DIR, 'cli', 'binaries', platform)
    });
  }

  // MCP platform packages
  for (const platform of PLATFORMS) {
    packagesToPublish.push({
      type: 'MCP',
      dir: path.join(PACKAGES_DIR, 'mcp', 'binaries', platform)
    });
  }

  // HTTP server platform packages
  for (const platform of PLATFORMS) {
    packagesToPublish.push({
      type: 'HTTP',
      dir: path.join(PACKAGES_DIR, 'http-server', 'binaries', platform)
    });
  }

  console.log(`Publishing ${packagesToPublish.length} platform packages in parallel...\n`);

  // Publish all packages in parallel for faster publishing
  const results = await Promise.all(
    packagesToPublish.map(async ({ type, dir }) => {
      const result = await publishPackage(dir, dryRun, tag);
      return { ...result, type };
    })
  );

  // Group and display results by type
  const groupedResults: Record<string, PublishResult[]> = {
    CLI: [],
    MCP: [],
    HTTP: []
  };

  for (const result of results) {
    if (result.type && result.type in groupedResults) {
      groupedResults[result.type].push(result);
    }
  }

  for (const [type, typeResults] of Object.entries(groupedResults)) {
    console.log(`\n📁 ${type} Platform Packages:`);
    for (const result of typeResults) {
      if (result.success) {
        console.log(`  ✓ ${result.package}`);
      } else {
        console.log(`  ✗ ${result.package}: ${result.error}`);
      }
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

let tag: string | undefined;
const tagIndex = args.indexOf('--tag');
if (tagIndex !== -1 && args[tagIndex + 1]) {
  tag = args[tagIndex + 1];
}

publishPlatformPackages(dryRun, tag).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
