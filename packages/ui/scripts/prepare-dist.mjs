import { access, cp, mkdir, rm, readdir, lstat, readlink, symlink, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkgDir = resolve(__dirname, '..');
const repoRoot = resolve(pkgDir, '..', '..');
const webDir = join(repoRoot, 'packages', 'web');
const nextDir = join(webDir, '.next');
const standaloneSrc = join(nextDir, 'standalone');
const staticSrc = join(nextDir, 'static');
const publicSrc = join(webDir, 'public');
const buildIdSrc = join(nextDir, 'BUILD_ID');
const distDir = join(pkgDir, 'dist');

await ensureWebBuild();
await rebuildDist();

async function ensureWebBuild() {
  const serverFile = await locateStandaloneServer();
  if (serverFile) {
    return;
  }

  console.log('ℹ Building @leanspec/web (standalone output)...');
  await runCommand('pnpm', ['--filter', '@leanspec/web', 'build'], { cwd: repoRoot });

  if (!(await locateStandaloneServer())) {
    throw new Error('Failed to locate .next/standalone/server.js after building @leanspec/web');
  }
}

async function rebuildDist() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  await copyDirectory(standaloneSrc, join(distDir, 'standalone'));

  // Rebase PNPM symlinks so published package doesn't reference absolute paths
  await fixStandaloneSymlinks();

  // Ensure node_modules contains real directories instead of symlinks
  await materializeStandaloneNodeModules();

  // Copy static assets into the standalone structure for distribution
  await copyStaticAssets();

  if (existsSync(buildIdSrc)) {
    await cp(buildIdSrc, join(distDir, 'BUILD_ID'));
  }

  console.log('✅ LeanSpec UI artifacts copied to packages/ui/dist');
}

async function fixStandaloneSymlinks() {
  const origRoot = standaloneSrc;
  const newRoot = join(distDir, 'standalone');
  const nodeModulesDir = join(newRoot, 'node_modules');

  if (!(await pathExists(nodeModulesDir))) {
    return;
  }

  console.log('  ✓ Rewriting symlinks for standalone node_modules');
  await rewriteSymlinks(nodeModulesDir, origRoot, newRoot);
}

async function rewriteSymlinks(dir, origRoot, newRoot) {
  const entries = await readdir(dir, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const fullPath = join(dir, entry.name);

    if (entry.isSymbolicLink()) {
      const linkTarget = await readlink(fullPath);
      if (linkTarget.startsWith(origRoot)) {
        const updatedTarget = linkTarget.replace(origRoot, newRoot);
        const relativeTarget = relative(dirname(fullPath), updatedTarget);
        await unlink(fullPath);
        await symlink(relativeTarget || '.', fullPath);
      }
      return;
    }

    if (entry.isDirectory()) {
      await rewriteSymlinks(fullPath, origRoot, newRoot);
    }
  }));
}

async function materializeStandaloneNodeModules() {
  const nodeModulesDir = join(distDir, 'standalone', 'node_modules');
  if (!(await pathExists(nodeModulesDir))) {
    return;
  }

  console.log('  ✓ Materializing node_modules symlinks');
  await materializeSymlinks(nodeModulesDir);
}

async function materializeSymlinks(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  await Promise.all(entries.map(async (entry) => {
    const fullPath = join(dir, entry.name);

    if (entry.isSymbolicLink()) {
      const target = await readlink(fullPath);
      const resolvedTarget = resolve(dirname(fullPath), target);
      await rm(fullPath, { recursive: true, force: true });
      await copyDirectory(resolvedTarget, fullPath);
      return;
    }

    if (entry.isDirectory()) {
      await materializeSymlinks(fullPath);
    }
  }));
}

async function copyStaticAssets() {
  const standaloneWebDir = join(distDir, 'standalone', 'packages', 'web');
  const nextDir = join(standaloneWebDir, '.next');
  
  // Copy .next/static directory into standalone
  const staticDest = join(nextDir, 'static');
  await copyDirectory(staticSrc, staticDest);
  console.log('  ✓ Copied static assets to .next/static');
  
  // Copy public assets into standalone
  const publicDest = join(standaloneWebDir, 'public');
  await copyDirectory(publicSrc, publicDest);
  console.log('  ✓ Copied public assets');
}

async function copyDirectory(src, dest) {
  if (!(await pathExists(src))) {
    throw new Error(`Missing build artifact at ${src}. Run pnpm --filter @leanspec/web build first.`);
  }
  await cp(src, dest, { recursive: true, force: true });
}

async function pathExists(pathname) {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

async function locateStandaloneServer() {
  const candidates = [
    join(standaloneSrc, 'server.js'),
    join(standaloneSrc, 'packages', 'web', 'server.js')
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function runCommand(command, args, options) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}
