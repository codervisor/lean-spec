#!/usr/bin/env node
import { cp, access, constants } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkgDir = join(__dirname, '..');
const repoRoot = join(pkgDir, '../..');

// Copy static assets into standalone build
const staticSrc = join(pkgDir, '.next', 'static');
const staticDest = join(pkgDir, '.next', 'standalone', 'packages', 'ui', '.next', 'static');

const publicSrc = join(pkgDir, 'public');
const publicDest = join(pkgDir, '.next', 'standalone', 'packages', 'ui', 'public');

// Copy specs directory to standalone build (for filesystem mode)
const specsSrc = join(repoRoot, 'specs');
const specsDest = join(pkgDir, '.next', 'standalone', 'specs');

try {
  await cp(staticSrc, staticDest, { recursive: true, force: true });
  console.log('✓ Copied .next/static to standalone build');
  
  await cp(publicSrc, publicDest, { recursive: true, force: true });
  console.log('✓ Copied public assets to standalone build');
  
  // Copy specs directory for filesystem mode
  try {
    await access(specsSrc, constants.F_OK);
    await cp(specsSrc, specsDest, { recursive: true, force: true });
    console.log('✓ Copied specs to standalone build');
  } catch {
    console.log('⚠ No specs directory found (skipping specs copy)');
  }
} catch (error) {
  console.error('Failed to copy assets:', error);
  process.exit(1);
}
