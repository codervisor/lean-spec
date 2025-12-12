#!/usr/bin/env node
/**
 * build-sidecar.mjs
 * 
 * Builds the Next.js standalone server into a self-contained executable using pkg,
 * then places it in src-tauri/binaries with the Tauri-expected naming convention.
 * 
 * This eliminates all node_modules/pnpm symlink issues by bundling everything
 * into a single binary that includes Node.js runtime.
 */
import { exec as execCallback, spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const exec = promisify(execCallback);

// Resolve paths relative to this script location
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const desktopPackageRoot = path.resolve(scriptsDir, '..');
const repoRoot = path.resolve(desktopPackageRoot, '../..');
const binariesDir = path.join(desktopPackageRoot, 'src-tauri/binaries');

// UI standalone build output
const uiStandalone = path.join(repoRoot, 'packages/ui/.next/standalone');
const serverEntry = path.join(uiStandalone, 'packages/ui/server.js');

// Map Rust target triples to pkg targets
// Tauri expects: binaries/name-{target_triple}
const TARGET_MAP = {
  'x86_64-unknown-linux-gnu': { pkg: 'node22-linux-x64', ext: '' },
  'aarch64-unknown-linux-gnu': { pkg: 'node22-linux-arm64', ext: '' },
  'x86_64-apple-darwin': { pkg: 'node22-macos-x64', ext: '' },
  'aarch64-apple-darwin': { pkg: 'node22-macos-arm64', ext: '' },
  'x86_64-pc-windows-msvc': { pkg: 'node22-win-x64', ext: '.exe' },
  'aarch64-pc-windows-msvc': { pkg: 'node22-win-arm64', ext: '.exe' },
};

// Determine current platform's target triple
function getCurrentTarget() {
  const platform = os.platform();
  const arch = os.arch();
  
  if (platform === 'linux' && arch === 'x64') return 'x86_64-unknown-linux-gnu';
  if (platform === 'linux' && arch === 'arm64') return 'aarch64-unknown-linux-gnu';
  if (platform === 'darwin' && arch === 'x64') return 'x86_64-apple-darwin';
  if (platform === 'darwin' && arch === 'arm64') return 'aarch64-apple-darwin';
  if (platform === 'win32' && arch === 'x64') return 'x86_64-pc-windows-msvc';
  if (platform === 'win32' && arch === 'arm64') return 'aarch64-pc-windows-msvc';
  
  throw new Error(`Unsupported platform/arch: ${platform}/${arch}`);
}

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
  // Use filter to skip files that can't be accessed (broken symlinks)
  await fs.cp(source, destination, { 
    recursive: true, 
    dereference: true,
    filter: async (src) => {
      try {
        await fs.stat(src);
        return true;
      } catch {
        return false;
      }
    }
  });
}

async function createPkgConfig(tempDir) {
  // Create a package.json for pkg to use
  const pkgConfig = {
    name: 'ui-server',
    bin: 'server.js',
    pkg: {
      // Include all assets that Next.js needs at runtime
      assets: [
        '.next/**/*',
        'public/**/*',
        'node_modules/**/*',
      ],
      // Output options
      outputPath: 'dist',
    }
  };
  
  await fs.writeFile(
    path.join(tempDir, 'package.json'),
    JSON.stringify(pkgConfig, null, 2)
  );
}

async function buildSidecar(targetTriple) {
  const targetInfo = TARGET_MAP[targetTriple];
  if (!targetInfo) {
    throw new Error(`Unknown target triple: ${targetTriple}`);
  }

  console.log(`\n📦 Building sidecar for ${targetTriple} (pkg target: ${targetInfo.pkg})`);

  // Check if standalone build exists
  if (!(await pathExists(serverEntry))) {
    throw new Error(
      `UI standalone build not found at ${serverEntry}.\n` +
      `Please run: pnpm --filter @leanspec/ui build`
    );
  }

  // Create a temp directory for the build
  const tempDir = path.join(os.tmpdir(), `leanspec-sidecar-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    console.log('  → Copying standalone build to temp directory...');
    
    // Copy the entire standalone structure
    const standaloneTemp = path.join(tempDir, 'standalone');
    await copyDir(uiStandalone, standaloneTemp);
    
    // Flatten pnpm node_modules to avoid symlink issues
    await flattenNodeModules(standaloneTemp);
    
    // Create pkg configuration
    const uiDir = path.join(standaloneTemp, 'packages/ui');
    await createPkgConfig(uiDir);

    // Ensure binaries directory exists
    await fs.mkdir(binariesDir, { recursive: true });

    // Output path follows Tauri naming convention: name-{target_triple}
    const outputName = `ui-server-${targetTriple}${targetInfo.ext}`;
    const outputPath = path.join(binariesDir, outputName);

    console.log(`  → Running pkg (target: ${targetInfo.pkg})...`);
    
    // Build with pkg
    // Note: We use --config to point to our custom package.json
    const pkgPath = path.join(desktopPackageRoot, 'node_modules/.bin/pkg');
    
    await new Promise((resolve, reject) => {
      const args = [
        path.join(uiDir, 'server.js'),
        '--target', targetInfo.pkg,
        '--output', outputPath,
        '--config', path.join(uiDir, 'package.json'),
        '--compress', 'GZip',
      ];
      
      console.log(`  → Executing: pkg ${args.join(' ')}`);
      
      const child = spawn(pkgPath, args, {
        cwd: uiDir,
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });
      
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pkg exited with code ${code}`));
        }
      });
    });

    // Verify the output
    if (!(await pathExists(outputPath))) {
      throw new Error(`pkg did not produce expected output at ${outputPath}`);
    }

    const stats = await fs.stat(outputPath);
    console.log(`  ✅ Built: ${outputName} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);

    return outputPath;
  } finally {
    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function flattenNodeModules(standaloneRoot) {
  const pnpmStore = path.join(standaloneRoot, 'node_modules/.pnpm');
  const flatNodeModules = path.join(standaloneRoot, 'packages/ui/node_modules');

  if (!(await pathExists(pnpmStore))) {
    console.log('  → No pnpm store found, skipping flattening');
    return;
  }

  console.log('  → Flattening pnpm node_modules...');

  // Clear existing node_modules in packages/ui
  await fs.rm(flatNodeModules, { recursive: true, force: true });
  await fs.mkdir(flatNodeModules, { recursive: true });

  // Walk through pnpm store and copy all packages
  const storeEntries = await fs.readdir(pnpmStore, { withFileTypes: true });
  const copiedPackages = new Set();

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
      // Skip .pnpm directory and already copied packages
      if (pkg.name === '.pnpm' || pkg.name.startsWith('.')) continue;
      if (copiedPackages.has(pkg.name)) continue;

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
        if (pkg.name.startsWith('@') && pkg.isDirectory()) {
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
            
            if (!copiedPackages.has(scopeKey)) {
              try {
                await fs.stat(scopeSrc);
                await fs.rm(scopeDest, { recursive: true, force: true });
                await fs.cp(scopeSrc, scopeDest, { recursive: true, dereference: true });
                copiedPackages.add(scopeKey);
              } catch {
                // Skip if source doesn't exist
              }
            }
          }
        } else {
          await fs.rm(dest, { recursive: true, force: true });
          await fs.cp(src, dest, { recursive: true, dereference: true });
        }
        copiedPackages.add(pkg.name);
      } catch (error) {
        console.warn(`  ⚠ Failed to copy ${pkg.name}: ${error.message}`);
      }
    }
  }

  console.log(`  → Flattened ${copiedPackages.size} packages`);
}

async function main() {
  console.log('🔧 LeanSpec Sidecar Builder');
  console.log('===========================\n');

  // Determine which target(s) to build
  let targets = [];
  
  const targetArg = process.argv[2];
  if (targetArg === '--all') {
    targets = Object.keys(TARGET_MAP);
  } else if (targetArg && TARGET_MAP[targetArg]) {
    targets = [targetArg];
  } else if (targetArg) {
    console.error(`Unknown target: ${targetArg}`);
    console.error(`Valid targets: ${Object.keys(TARGET_MAP).join(', ')}`);
    console.error(`Or use --all to build for all platforms`);
    process.exit(1);
  } else {
    // Default to current platform
    targets = [getCurrentTarget()];
  }

  console.log(`Building for targets: ${targets.join(', ')}`);

  const results = [];
  for (const target of targets) {
    try {
      const outputPath = await buildSidecar(target);
      results.push({ target, success: true, path: outputPath });
    } catch (error) {
      console.error(`\n❌ Failed to build for ${target}:`, error.message);
      results.push({ target, success: false, error: error.message });
    }
  }

  console.log('\n===========================');
  console.log('📊 Build Summary:');
  for (const result of results) {
    if (result.success) {
      console.log(`  ✅ ${result.target}`);
    } else {
      console.log(`  ❌ ${result.target}: ${result.error}`);
    }
  }

  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
