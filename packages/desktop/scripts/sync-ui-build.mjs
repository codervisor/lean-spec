#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '../..');
const uiStandalone = path.join(repoRoot, 'packages/ui/.next/standalone');
const desktopResources = path.join(repoRoot, 'packages/desktop/src-tauri/ui-standalone');

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(source, destination) {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const src = path.join(source, entry.name);
    const dest = path.join(destination, entry.name);
    
    if (entry.isSymbolicLink()) {
      try {
        // Resolve and copy the symlink target to ensure it works after packaging
        const target = await fs.readlink(src);
        const absoluteTarget = path.resolve(path.dirname(src), target);
        const stats = await fs.stat(absoluteTarget);
        
        if (stats.isDirectory()) {
          await copyDir(absoluteTarget, dest);
        } else if (stats.isFile()) {
          await fs.copyFile(absoluteTarget, dest);
        }
      } catch (error) {
        console.warn(`Skipping broken symlink: ${src}`);
      }
    } else if (entry.isDirectory()) {
      await copyDir(src, dest);
    } else if (entry.isFile()) {
      await fs.copyFile(src, dest);
    }
  }
}

async function flattenNodeModules(standaloneRoot) {
  const pnpmStore = path.join(standaloneRoot, 'node_modules/.pnpm');
  const flatNodeModules = path.join(standaloneRoot, 'packages/ui/node_modules');

  if (!(await pathExists(pnpmStore))) {
    console.warn(`Skipping pnpm flattening: ${pnpmStore} not found`);
    return;
  }

  await fs.rm(flatNodeModules, { recursive: true, force: true });
  await fs.mkdir(flatNodeModules, { recursive: true });

  const storeEntries = await fs.readdir(pnpmStore, { withFileTypes: true });
  for (const entry of storeEntries) {
    if (!entry.isDirectory()) continue;

    const packageNodeModules = path.join(pnpmStore, entry.name, 'node_modules');
    if (!(await pathExists(packageNodeModules))) continue;

    const packages = await fs.readdir(packageNodeModules);
    for (const pkg of packages) {
      const src = path.join(packageNodeModules, pkg);
      const dest = path.join(flatNodeModules, pkg);

      await fs.rm(dest, { recursive: true, force: true });
      await fs.cp(src, dest, { recursive: true, dereference: true });
    }
  }

  console.log('✓ Flattened pnpm node_modules for embedded UI');
}

async function main() {
  try {
    await fs.access(uiStandalone);
    await fs.rm(desktopResources, { recursive: true, force: true });
    await copyDir(uiStandalone, desktopResources);
    await flattenNodeModules(desktopResources);
    console.log('✓ Synced @leanspec/ui standalone build into Tauri bundle');
  } catch (error) {
    console.error('Failed to sync UI build:', error.message ?? error);
    process.exitCode = 1;
  }
}

main();
