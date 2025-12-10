#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '../..');
const uiStandalone = path.join(repoRoot, 'packages/ui/.next/standalone');
const desktopResources = path.join(repoRoot, 'packages/desktop/src-tauri/ui-standalone');

async function copyDir(source, destination) {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const src = path.join(source, entry.name);
    const dest = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyDir(src, dest);
    } else if (entry.isFile()) {
      await fs.copyFile(src, dest);
    }
  }
}

async function main() {
  try {
    await fs.access(uiStandalone);
    await fs.rm(desktopResources, { recursive: true, force: true });
    await copyDir(uiStandalone, desktopResources);
    console.log('✓ Synced @leanspec/ui standalone build into Tauri bundle');
  } catch (error) {
    console.error('Failed to sync UI build:', error.message ?? error);
    process.exitCode = 1;
  }
}

main();
