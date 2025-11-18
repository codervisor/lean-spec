#!/usr/bin/env node
import { cp } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkgDir = join(__dirname, '..');

// Copy static assets into standalone build
const staticSrc = join(pkgDir, '.next', 'static');
const staticDest = join(pkgDir, '.next', 'standalone', 'packages', 'ui', '.next', 'static');

const publicSrc = join(pkgDir, 'public');
const publicDest = join(pkgDir, '.next', 'standalone', 'packages', 'ui', 'public');

try {
  await cp(staticSrc, staticDest, { recursive: true, force: true });
  console.log('✓ Copied .next/static to standalone build');
  
  await cp(publicSrc, publicDest, { recursive: true, force: true });
  console.log('✓ Copied public assets to standalone build');
} catch (error) {
  console.error('Failed to copy assets:', error);
  process.exit(1);
}
