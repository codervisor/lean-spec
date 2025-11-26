#!/usr/bin/env node
import { cp, access, constants } from 'node:fs/promises';
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

// Copy database file to standalone build
const dbSrc = join(pkgDir, 'leanspec.db');
const dbDest = join(pkgDir, '.next', 'standalone', 'packages', 'ui', 'leanspec.db');

try {
  await cp(staticSrc, staticDest, { recursive: true, force: true });
  console.log('✓ Copied .next/static to standalone build');
  
  await cp(publicSrc, publicDest, { recursive: true, force: true });
  console.log('✓ Copied public assets to standalone build');
  
  // Copy database if it exists (created by db:seed)
  try {
    await access(dbSrc, constants.F_OK);
    await cp(dbSrc, dbDest, { force: true });
    console.log('✓ Copied leanspec.db to standalone build');
  } catch {
    console.log('⚠ No leanspec.db found (skipping database copy)');
  }
} catch (error) {
  console.error('Failed to copy assets:', error);
  process.exit(1);
}
