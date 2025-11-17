import { access, cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

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
  await copyDirectory(staticSrc, join(distDir, 'static'));
  await copyDirectory(publicSrc, join(distDir, 'public'));

  if (existsSync(buildIdSrc)) {
    await cp(buildIdSrc, join(distDir, 'BUILD_ID'));
  }

  console.log('✅ LeanSpec UI artifacts copied to packages/ui/dist');
}

async function copyDirectory(src, dest) {
  if (!(await pathExists(src))) {
    throw new Error(`Missing build artifact at ${src}. Run pnpm --filter @leanspec/web build first.`);
  }
  await cp(src, dest, { recursive: true });
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
