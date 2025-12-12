#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);

async function main() {
  const version = process.env.LEAN_SPEC_NODE_VERSION || '22.11.0';
  const arch = process.arch === 'x64' ? 'x64' : process.arch === 'arm64' ? 'arm64' : null;
  if (!arch) {
    console.log(`Skipping Node download: unsupported architecture ${process.arch}.`);
    return;
  }

  // Resolve paths relative to this script location (not cwd) to be robust when
  // invoked by Tauri beforeBuildCommand from different working directories.
  const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
  const desktopPackageRoot = path.resolve(scriptsDir, '..');
  const repoRoot = path.resolve(desktopPackageRoot, '../..');

  const baseDestDir = path.join(repoRoot, 'packages/desktop/src-tauri/resources/node');
  await fs.mkdir(baseDestDir, { recursive: true });

  let filename;
  let extractedBinaryRelative;
  let target;
  let outputName;

  if (process.platform === 'linux') {
    target = `linux-${arch}`;
    filename = `node-v${version}-linux-${arch}.tar.xz`;
    extractedBinaryRelative = path.join(`node-v${version}-linux-${arch}`, 'bin', 'node');
    outputName = 'node';
  } else if (process.platform === 'darwin') {
    target = `macos-${arch}`;
    filename = `node-v${version}-darwin-${arch}.tar.gz`;
    extractedBinaryRelative = path.join(`node-v${version}-darwin-${arch}`, 'bin', 'node');
    outputName = 'node';
  } else if (process.platform === 'win32') {
    target = `windows-${arch}`;
    filename = `node-v${version}-win-${arch}.zip`;
    extractedBinaryRelative = path.join(`node-v${version}-win-${arch}`, 'node.exe');
    outputName = 'node.exe';
  } else {
    console.log(`Skipping Node download: unsupported platform ${process.platform}.`);
    return;
  }

  const url = `https://nodejs.org/dist/v${version}/${filename}`;

  const destDir = path.join(baseDestDir, target);
  const tarPath = path.join(os.tmpdir(), filename);

  await fs.rm(destDir, { recursive: true, force: true });
  await fs.mkdir(destDir, { recursive: true });

  console.log(`Downloading Node ${version} from ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download Node binary (${response.status} ${response.statusText})`);
  }

  const tarball = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(tarPath, tarball);
  console.log(`Saved tarball to ${tarPath}`);

  console.log('Extracting node binary...');
  const extractDir = path.join(os.tmpdir(), `node-extract-${Date.now()}`);
  await fs.mkdir(extractDir, { recursive: true });

  // GitHub runners (including Windows) ship with a bsdtar-compatible `tar`
  // that can extract .tar.gz/.tar.xz/.zip.
  await exec('tar', ['-xf', tarPath, '-C', extractDir]);

  const nodeBinary = path.join(extractDir, extractedBinaryRelative);
  const nodePath = path.join(destDir, outputName);
  
  await fs.copyFile(nodeBinary, nodePath);
  if (process.platform !== 'win32') {
    await fs.chmod(nodePath, 0o755);
  }
  
  await fs.rm(tarPath, { force: true });
  await fs.rm(extractDir, { recursive: true, force: true });

  console.log(`Bundled Node ready at ${nodePath}`);
}

main().catch((error) => {
  console.error('Failed to bundle Node runtime:', error);
  process.exitCode = 1;
});
