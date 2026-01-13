#!/usr/bin/env tsx
/**
 * Bump version to dev prerelease
 * 
 * This script creates a deterministic dev version based on a provided suffix.
 * It extracts the base version from package.json and appends -dev.<suffix>.
 * 
 * Usage:
 *   tsx scripts/bump-dev-version.ts <suffix>
 *   
 * Example:
 *   tsx scripts/bump-dev-version.ts 12345
 *   # 0.2.15 -> 0.2.15-dev.12345
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGE_JSON = path.join(ROOT_DIR, 'package.json');

async function bumpDevVersion(suffix: string): Promise<void> {
  // Read current version
  const packageJson = JSON.parse(await fs.readFile(PACKAGE_JSON, 'utf-8'));
  const currentVersion = packageJson.version;

  // Extract base version (remove any prerelease suffix)
  const baseVersion = currentVersion.replace(/-dev\..*$/, '');

  // Create dev version
  const devVersion = `${baseVersion}-dev.${suffix}`;

  console.log(`Bumping version:`);
  console.log(`  Current: ${currentVersion}`);
  console.log(`  Base:    ${baseVersion}`);
  console.log(`  New:     ${devVersion}`);

  // Update package.json
  packageJson.version = devVersion;
  await fs.writeFile(PACKAGE_JSON, JSON.stringify(packageJson, null, 2) + '\n');

  console.log(`\n✅ Version bumped to ${devVersion}`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Run: pnpm sync-versions`);
  console.log(`   2. Build and publish packages`);
}

// Parse CLI args
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Error: Missing suffix argument');
  console.error('Usage: tsx scripts/bump-dev-version.ts <suffix>');
  process.exit(1);
}

const suffix = args[0];
bumpDevVersion(suffix).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
