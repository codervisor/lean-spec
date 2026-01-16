#!/usr/bin/env tsx
/**
 * Validate that no package.json files contain workspace:* protocol references
 * 
 * This prevents accidentally publishing packages with unresolved workspace dependencies,
 * which causes installation failures with: "Unsupported URL Type workspace:"
 * 
 * Usage:
 *   tsx scripts/validate-no-workspace-protocol.ts
 *   
 * Exit codes:
 *   0 - No workspace:* found
 *   1 - Found workspace:* references that need to be resolved
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');

interface PackageJson {
  name: string;
  version: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

interface WorkspaceRef {
  packagePath: string;
  packageName: string;
  dependencyType: string;
  dependencyName: string;
}

async function findPackageJsonFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      // Skip node_modules, build artifacts, and other non-source directories
      if (
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === '.next' ||
        entry.name === 'target' ||
        entry.name === '.turbo'
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name === 'package.json') {
        files.push(fullPath);
      }
    }
  }

  await walk(dir);
  return files;
}

async function findWorkspaceReferences(): Promise<WorkspaceRef[]> {
  const packagesDir = path.join(ROOT_DIR, 'packages');
  const packageJsonFiles = await findPackageJsonFiles(packagesDir);

  const workspaceRefs: WorkspaceRef[] = [];

  for (const pkgPath of packageJsonFiles) {
    const content = await fs.readFile(pkgPath, 'utf-8');
    const pkg: PackageJson = JSON.parse(content);

    // Skip private packages (not published to npm)
    if (pkg.private) continue;

    const depTypes = [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ] as const;

    for (const depType of depTypes) {
      const deps = pkg[depType];
      if (!deps) continue;

      for (const [depName, depVersion] of Object.entries(deps)) {
        if (depVersion.startsWith('workspace:')) {
          workspaceRefs.push({
            packagePath: path.relative(ROOT_DIR, pkgPath),
            packageName: pkg.name,
            dependencyType: depType,
            dependencyName: depName,
          });
        }
      }
    }
  }

  return workspaceRefs;
}

async function validateNoWorkspaceProtocol(): Promise<boolean> {
  console.log('🔍 Validating no workspace:* protocol references...\n');

  const workspaceRefs = await findWorkspaceReferences();

  if (workspaceRefs.length === 0) {
    console.log('✅ No workspace:* protocol references found!');
    console.log('\nAll packages are ready for npm publish.');
    return true;
  }

  console.log('❌ ERROR: Found workspace:* protocol references\n');
  console.log('These must be resolved before publishing to npm.\n');
  console.log('Run: pnpm prepare-publish\n');

  console.log('Found references:');
  for (const ref of workspaceRefs) {
    console.log(`  ${ref.packagePath}`);
    console.log(`    ${ref.packageName}`);
    console.log(`    └─ ${ref.dependencyType}.${ref.dependencyName}: workspace:*\n`);
  }

  return false;
}

validateNoWorkspaceProtocol().then(valid => {
  process.exit(valid ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
