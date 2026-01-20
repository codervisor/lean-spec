#!/usr/bin/env node
/**
 * copy-rust-binaries.mjs
 * 
 * Copies Rust binaries from rust/target/release to packages/{cli,mcp}/binaries/{platform}/
 * Automatically detects current platform and copies the appropriate binary.
 * 
 * Usage:
 *   node scripts/copy-rust-binaries.mjs           # Copy current platform
 *   node scripts/copy-rust-binaries.mjs --all     # Copy all platforms (requires cross-compilation)
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const REPOSITORY_URL = 'https://github.com/codervisor/lean-spec.git';

// Platform mapping
const PLATFORM_MAP = {
  linux: { x64: 'linux-x64', arm64: 'linux-arm64' },
  darwin: { x64: 'darwin-x64', arm64: 'darwin-arm64' },
  win32: { x64: 'windows-x64', arm64: 'windows-arm64' }
};

const PLATFORM_INFO = {
  'darwin-x64': { os: 'darwin', cpu: 'x64', label: 'macOS x64' },
  'darwin-arm64': { os: 'darwin', cpu: 'arm64', label: 'macOS ARM64' },
  'linux-x64': { os: 'linux', cpu: 'x64', label: 'Linux x64' },
  'linux-arm64': { os: 'linux', cpu: 'arm64', label: 'Linux ARM64' },
  'windows-x64': { os: 'win32', cpu: 'x64', label: 'Windows x64' }
};

// All platforms for --all flag
const ALL_PLATFORMS = Object.keys(PLATFORM_INFO);

const BINARY_CONFIG = {
  'lean-spec': {
    packagePath: 'cli',
    packagePrefix: '@leanspec/cli',
    description: 'LeanSpec CLI binary'
  },
  'leanspec-mcp': {
    packagePath: 'mcp',
    packagePrefix: '@leanspec/mcp',
    description: 'LeanSpec MCP server binary'
  },
  'leanspec-http': {
    packagePath: 'http-server',
    packagePrefix: '@leanspec/http',
    description: 'LeanSpec HTTP server binary'
  }
};

async function resolveTargetVersion() {
  const rootPackagePath = path.join(ROOT, 'package.json');
  const rootPackage = JSON.parse(await fs.readFile(rootPackagePath, 'utf-8'));

  if (rootPackage.version) {
    return rootPackage.version;
  }

  const cliPackagePath = path.join(ROOT, 'packages', 'cli', 'package.json');
  const cliPackage = JSON.parse(await fs.readFile(cliPackagePath, 'utf-8'));

  if (!cliPackage.version) {
    throw new Error('Unable to resolve version from root or packages/cli/package.json');
  }

  console.warn('⚠️  Root package.json missing version; using packages/cli/package.json version.');
  return cliPackage.version;
}

function getCurrentPlatform() {
  const platform = process.platform;
  const arch = process.arch;
  const platformKey = PLATFORM_MAP[platform]?.[arch];

  if (!platformKey) {
    throw new Error(`Unsupported platform: ${platform}-${arch}`);
  }

  return platformKey;
}

function getPlatformInfo(platformKey) {
  const info = PLATFORM_INFO[platformKey];

  if (!info) {
    throw new Error(`Unknown platform key: ${platformKey}`);
  }

  return info;
}

function getBinaryFileName(binaryName, platformKey) {
  return platformKey.startsWith('windows-') ? `${binaryName}.exe` : binaryName;
}

async function ensurePackageJson({
  destDir,
  platformKey,
  binaryName,
  packagePrefix,
  description,
  version,
}) {
  const packageJsonPath = path.join(destDir, 'package.json');
  const platformInfo = getPlatformInfo(platformKey);
  const binaryFileName = getBinaryFileName(binaryName, platformKey);
  const packageName = `${packagePrefix}-${platformKey}`;
  const isWindows = platformKey.startsWith('windows-');

  // Always create/update postinstall script
  const postinstallPath = path.join(destDir, 'postinstall.js');
  const postinstallContent = isWindows
    ? `#!/usr/bin/env node
/**
 * Postinstall script - no-op on Windows (permissions not needed).
 * This file exists for consistency across all platform packages.
 */
console.log('✓ ${binaryFileName} ready');
`
    : `#!/usr/bin/env node
/**
 * Postinstall script to set execute permissions on the binary.
 * npm doesn't preserve file permissions, so we need to set them after install.
 */
const { chmodSync } = require('fs');
const { join } = require('path');

const binaryPath = join(__dirname, '${binaryFileName}');

try {
  chmodSync(binaryPath, 0o755);
  console.log('✓ Set execute permissions on ${binaryFileName} binary');
} catch (err) {
  console.error('Warning: Could not set execute permissions:', err.message);
  // Don't fail the install
}
`;
  await fs.writeFile(postinstallPath, postinstallContent);

  // Check if package.json already exists
  try {
    await fs.access(packageJsonPath);
    // Update existing package.json to include postinstall if missing
    const existingPkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    let updated = false;

    const files = new Set(existingPkg.files || []);
    files.add('postinstall.js');
    if (binaryName === 'leanspec-http') {
      files.add('ui-dist');
      files.add('ui-dist/**');
    }
    if (existingPkg.files?.length !== files.size) {
      existingPkg.files = [...files];
      updated = true;
    }

    if (!existingPkg.scripts?.postinstall) {
      existingPkg.scripts = { ...(existingPkg.scripts || {}), postinstall: 'node postinstall.js' };
      updated = true;
    }

    if (updated) {
      await fs.writeFile(packageJsonPath, JSON.stringify(existingPkg, null, 2) + '\n');
      console.log(`🔄 Updated ${packageName} package.json`);
    }
    return;
  } catch (e) {
    // Missing manifest; create below
  }

  const packageJson = {
    name: packageName,
    version,
    description: `${description} for ${platformInfo.label}`,
    os: [platformInfo.os],
    cpu: [platformInfo.cpu],
    main: binaryFileName,
    files: binaryName === 'leanspec-http'
      ? [binaryFileName, 'postinstall.js', 'ui-dist', 'ui-dist/**']
      : [binaryFileName, 'postinstall.js'],
    scripts: {
      postinstall: 'node postinstall.js'
    },
    repository: {
      type: 'git',
      url: REPOSITORY_URL
    },
    license: 'MIT'
  };

  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`🆕 Created ${packageName} package.json`);
}

async function killProcessesUsingBinary(binaryPath) {
  if (process.platform === 'win32') {
    // Windows: use handle.exe or just try to copy
    return;
  }

  try {
    // Use lsof to find processes using the binary
    const { execSync } = await import('node:child_process');
    const output = execSync(`lsof "${binaryPath}" 2>/dev/null || true`, { encoding: 'utf-8' });

    if (!output.trim()) {
      return; // No processes using the file
    }

    // Extract PIDs (skip header line)
    const lines = output.trim().split('\n').slice(1);
    const pids = [...new Set(lines.map(line => line.split(/\s+/)[1]).filter(Boolean))];

    if (pids.length > 0) {
      console.log(`⚠️  Found ${pids.length} process(es) using ${path.basename(binaryPath)}, stopping them...`);
      for (const pid of pids) {
        try {
          execSync(`kill ${pid}`, { stdio: 'ignore' });
        } catch (e) {
          // Process might already be dead
        }
      }
      // Give processes time to exit
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (e) {
    // lsof not available or other error, continue anyway
  }
}

async function copyBinary(binaryName, platformKey, version) {
  const config = BINARY_CONFIG[binaryName];

  if (!config) {
    throw new Error(`Unknown binary: ${binaryName}`);
  }

  const isWindows = platformKey.startsWith('windows-');
  const binaryFileName = getBinaryFileName(binaryName, platformKey);
  const sourcePath = path.join(ROOT, 'rust', 'target', 'release', binaryFileName);
  const destDir = path.join(ROOT, 'packages', config.packagePath, 'binaries', platformKey);
  const destPath = path.join(destDir, binaryFileName);

  // Check if source exists
  try {
    await fs.access(sourcePath);
  } catch (e) {
    console.warn(`⚠️  Source binary not found: ${sourcePath}`);
    return false;
  }

  // Ensure destination directory exists
  await fs.mkdir(destDir, { recursive: true });

  // Ensure platform package manifest exists
  await ensurePackageJson({
    destDir,
    platformKey,
    binaryName,
    packagePrefix: config.packagePrefix,
    description: config.description,
    version,
  });

  // Kill any processes using the destination binary
  try {
    await fs.access(destPath);
    await killProcessesUsingBinary(destPath);
  } catch (e) {
    // Destination doesn't exist yet, that's fine
  }

  // Copy binary
  await fs.copyFile(sourcePath, destPath);

  // Make executable on Unix
  if (!isWindows) {
    await fs.chmod(destPath, 0o755);
  }

  console.log(`✅ Copied ${binaryName} to ${config.packagePath}/binaries/${platformKey}/`);

  if (binaryName === 'leanspec-http') {
    await copyUiDist(destDir);
  }
  return true;
}

async function copyUiDist(destDir) {
  const sourceDist = path.join(ROOT, 'packages', 'ui', 'dist');
  const destDist = path.join(destDir, 'ui-dist');

  try {
    await fs.access(sourceDist);
  } catch (e) {
    console.warn(`⚠️  UI dist not found at ${sourceDist}. Skipping ui-dist copy.`);
    return;
  }

  await fs.rm(destDist, { recursive: true, force: true });
  await fs.mkdir(destDist, { recursive: true });
  await fs.cp(sourceDist, destDist, { recursive: true });
  console.log(`✅ Copied UI dist to ${path.relative(ROOT, destDist)}/`);
}

async function main() {
  const args = process.argv.slice(2);
  const copyAll = args.includes('--all');

  const rootVersion = await resolveTargetVersion();

  console.log('🔧 Copying Rust binaries...\n');

  const binaries = ['lean-spec', 'leanspec-mcp', 'leanspec-http'];

  if (copyAll) {
    console.log('📦 Copying all platforms (requires cross-compiled binaries)\n');

    for (const platformKey of ALL_PLATFORMS) {
      console.log(`\nPlatform: ${platformKey}`);
      for (const binary of binaries) {
        await copyBinary(binary, platformKey, rootVersion);
      }
    }
  } else {
    const currentPlatform = getCurrentPlatform();
    console.log(`📦 Copying for current platform: ${currentPlatform}\n`);

    for (const binary of binaries) {
      await copyBinary(binary, currentPlatform, rootVersion);
    }
  }

  console.log('\n✨ Done!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
