#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

async function main() {
  const version = process.env.LEAN_SPEC_NODE_VERSION || '22.11.0';
  if (process.platform !== 'linux') {
    console.log('Skipping Node download: only linux bundling is supported in this script.');
    return;
  }

  const arch = process.arch === 'x64' ? 'x64' : process.arch === 'arm64' ? 'arm64' : null;
  if (!arch) {
    console.log(`Skipping Node download: unsupported architecture ${process.arch}.`);
    return;
  }

  const filename = `node-v${version}-linux-${arch}.tar.xz`;
  const url = `https://nodejs.org/dist/v${version}/${filename}`;

  const repoRoot = path.resolve(process.cwd(), '../..');
  const destDir = path.join(repoRoot, 'packages/desktop/src-tauri/resources/node', `linux-${arch}`);
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
  const stripPrefix = `node-v${version}-linux-${arch}/bin/node`;
  await exec('tar', ['-xJf', tarPath, stripPrefix, '--strip-components', '2', '-C', destDir]);

  const nodePath = path.join(destDir, 'node');
  await fs.chmod(nodePath, 0o755);
  await fs.rm(tarPath, { force: true });

  console.log(`Bundled Node ready at ${nodePath}`);
}

main().catch((error) => {
  console.error('Failed to bundle Node runtime:', error);
  process.exitCode = 1;
});
