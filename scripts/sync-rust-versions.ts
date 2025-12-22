#!/usr/bin/env tsx
/**
 * Sync versions for Rust binary platform packages
 * 
 * This script ensures all platform-specific binary packages use the same version 
 * as the root package.json. It updates:
 * - CLI platform packages (lean-spec-darwin-x64, etc.)
 * - MCP platform packages (@leanspec/mcp-darwin-x64, etc.)
 * - HTTP server platform packages (@leanspec/http-darwin-x64, etc.)
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
const REPOSITORY_URL = 'https://github.com/codervisor/lean-spec.git';

interface PlatformInfo {
  os: string;
  cpu: string;
  label: string;
}

interface PackageFamily {
  key: string;
  label: string;
  packageDir: string;
  packagePrefix: string;
  binaryName: string;
  description: string;
}

const PLATFORM_INFO: Record<string, PlatformInfo> = {
  'darwin-x64': { os: 'darwin', cpu: 'x64', label: 'macOS x64' },
  'darwin-arm64': { os: 'darwin', cpu: 'arm64', label: 'macOS ARM64' },
  'linux-x64': { os: 'linux', cpu: 'x64', label: 'Linux x64' },
  'linux-arm64': { os: 'linux', cpu: 'arm64', label: 'Linux ARM64' },
  'windows-x64': { os: 'win32', cpu: 'x64', label: 'Windows x64' }
};

const PLATFORMS = Object.keys(PLATFORM_INFO);

const PACKAGE_FAMILIES: PackageFamily[] = [
  {
    key: 'cli',
    label: 'CLI',
    packageDir: path.join(PACKAGES_DIR, 'cli', 'binaries'),
    packagePrefix: '@leanspec/cli',
    binaryName: 'lean-spec',
    description: 'LeanSpec CLI binary'
  },
  {
    key: 'mcp',
    label: 'MCP',
    packageDir: path.join(PACKAGES_DIR, 'mcp', 'binaries'),
    packagePrefix: '@leanspec/mcp',
    binaryName: 'leanspec-mcp',
    description: 'LeanSpec MCP server binary'
  },
  {
    key: 'http',
    label: 'HTTP',
    packageDir: path.join(PACKAGES_DIR, 'http-server', 'binaries'),
    packagePrefix: '@leanspec/http',
    binaryName: 'leanspec-http',
    description: 'LeanSpec HTTP server binary'
  }
];

interface PackageJson {
  name: string;
  version: string;
  optionalDependencies?: Record<string, string>;
  [key: string]: unknown;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath: string): Promise<PackageJson> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function writeJsonFile(filePath: string, data: PackageJson): Promise<void> {
  const content = JSON.stringify(data, null, 2) + '\n';
  await fs.writeFile(filePath, content, 'utf-8');
}

function getPlatformInfo(platformKey: string): PlatformInfo {
  const info = PLATFORM_INFO[platformKey];

  if (!info) {
    throw new Error(`Unknown platform key: ${platformKey}`);
  }

  return info;
}

function buildPackageJson(
  family: PackageFamily,
  platformKey: string,
  version: string,
): PackageJson {
  const platformInfo = getPlatformInfo(platformKey);
  const binaryFileName = platformKey.startsWith('windows-')
    ? `${family.binaryName}.exe`
    : family.binaryName;

  return {
    name: `${family.packagePrefix}-${platformKey}`,
    version,
    description: `${family.description} for ${platformInfo.label}`,
    os: [platformInfo.os],
    cpu: [platformInfo.cpu],
    main: binaryFileName,
    files: [binaryFileName],
    repository: {
      type: 'git',
      url: REPOSITORY_URL,
    },
    license: 'MIT',
  };
}

async function resolveTargetVersion(): Promise<string> {
  const rootPackageJsonPath = path.join(ROOT_DIR, 'package.json');
  const rootPackage = await readJsonFile(rootPackageJsonPath);

  if (rootPackage.version) {
    return rootPackage.version;
  }

  const cliPackageJsonPath = path.join(PACKAGES_DIR, 'cli', 'package.json');
  const cliPackage = await readJsonFile(cliPackageJsonPath);

  if (cliPackage.version) {
    console.warn('Root package.json missing version; using packages/cli/package.json version.');
    return cliPackage.version;
  }

  throw new Error('Unable to resolve target version from root or CLI package.json');
}

async function syncRustVersions(dryRun: boolean = false): Promise<void> {
  console.log('🔄 Syncing Rust binary platform package versions...\n');

  const targetVersion = await resolveTargetVersion();

  console.log(`📦 Target version: ${targetVersion}\n`);

  let updated = 0;
  let skipped = 0;
  let created = 0;
  let errors = 0;

  for (const family of PACKAGE_FAMILIES) {
    console.log(`${family === PACKAGE_FAMILIES[0] ? '' : '\n'}📁 ${family.label} Platform Packages:`);

    for (const platform of PLATFORMS) {
      const packageDir = path.join(family.packageDir, platform);
      const packageJsonPath = path.join(packageDir, 'package.json');
      const expectedName = `${family.packagePrefix}-${platform}`;

      try {
        await fs.mkdir(packageDir, { recursive: true });

        if (!(await fileExists(packageJsonPath))) {
          if (dryRun) {
            console.log(`  ℹ ${expectedName}: package.json missing (would create)`);
            created++;
            continue;
          }

          const newPackageJson = buildPackageJson(family, platform, targetVersion);
          await writeJsonFile(packageJsonPath, newPackageJson);
          console.log(`  🆕 ${newPackageJson.name}: created at ${targetVersion}`);
          created++;
          continue;
        }

        const pkg = await readJsonFile(packageJsonPath);
        const packageName = pkg.name ?? expectedName;
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
        console.error(`  ✗ ${expectedName}: ${error}`);
        errors++;
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Summary:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Already synced: ${skipped}`);
  console.log(`  ${dryRun ? 'Would create' : 'Created'}: ${created}`);
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
