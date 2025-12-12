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
  const copiedPackages = new Map(); // Map of pkg name -> whether it has package.json

  for (const entry of storeEntries) {
    if (!entry.isDirectory()) continue;
    // Skip the hoisted node_modules inside .pnpm
    if (entry.name === 'node_modules') continue;

    const packageNodeModules = path.join(pnpmStore, entry.name, 'node_modules');
    if (!(await pathExists(packageNodeModules))) continue;

    let packages;
    try {
      packages = await fs.readdir(packageNodeModules, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const pkg of packages) {
      // Skip .pnpm directory and hidden files
      if (pkg.name === '.pnpm' || pkg.name.startsWith('.')) continue;

      const src = path.join(packageNodeModules, pkg.name);
      const dest = path.join(flatNodeModules, pkg.name);

      try {
        // Check source exists before copying
        try {
          await fs.stat(src);
        } catch {
          continue;
        }

        // Handle scoped packages (@org/pkg)
        if (pkg.name.startsWith('@')) {
          const scopeDir = path.join(flatNodeModules, pkg.name);
          await fs.mkdir(scopeDir, { recursive: true });
          
          let scopePackages;
          try {
            scopePackages = await fs.readdir(src, { withFileTypes: true });
          } catch {
            continue;
          }
          
          for (const scopePkg of scopePackages) {
            const scopeSrc = path.join(src, scopePkg.name);
            const scopeDest = path.join(scopeDir, scopePkg.name);
            const scopeKey = `${pkg.name}/${scopePkg.name}`;
            
            // Check if this version has package.json (more complete)
            const hasPackageJson = await pathExists(path.join(scopeSrc, 'package.json'));
            const existingHasPackageJson = copiedPackages.get(scopeKey);
            
            // Copy if not already copied, or if this version has package.json and previous didn't
            if (!copiedPackages.has(scopeKey) || (hasPackageJson && !existingHasPackageJson)) {
              try {
                await fs.stat(scopeSrc);
                await fs.rm(scopeDest, { recursive: true, force: true });
                await fs.cp(scopeSrc, scopeDest, { recursive: true, dereference: true });
                copiedPackages.set(scopeKey, hasPackageJson);
              } catch {
                // Skip if source doesn't exist
              }
            }
          }
        } else {
          // Check if this version has package.json (more complete)
          const hasPackageJson = await pathExists(path.join(src, 'package.json'));
          const existingHasPackageJson = copiedPackages.get(pkg.name);
          
          // Copy if not already copied, or if this version has package.json and previous didn't
          if (!copiedPackages.has(pkg.name) || (hasPackageJson && !existingHasPackageJson)) {
            await fs.rm(dest, { recursive: true, force: true });
            await fs.cp(src, dest, { recursive: true, dereference: true });
            copiedPackages.set(pkg.name, hasPackageJson);
          }
        }
      } catch (error) {
        console.warn(`  ⚠ Failed to copy ${pkg.name}: ${error.message}`);
      }
    }
  }

  console.log(`✓ Flattened ${copiedPackages.size} pnpm packages for embedded UI`);
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
