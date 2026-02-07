#!/usr/bin/env node
/**
 * Verify npm packages have all platform binaries
 * 
 * This script checks if published npm packages contain binaries for all
 * supported platforms. Used to verify that cross-platform builds worked correctly.
 * 
 * Usage:
 *   node scripts/verify-npm-packages.mjs [--package lean-spec] [--version 0.3.0]
 */

import { execSync } from 'node:child_process';
import { createWriteStream, promises as fs } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import { Readable } from 'node:stream';
import tar from 'tar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLATFORMS = [
  'darwin-x64',
  'darwin-arm64',
  'linux-x64',
  'linux-arm64',
  'windows-x64'
];

const PACKAGES = {
  'lean-spec': {
    main: 'lean-spec',
    platformPrefix: '@leanspec/cli',
    binary: 'lean-spec'
  },
  '@leanspec/mcp': {
    main: '@leanspec/mcp',
    platformPrefix: '@leanspec/mcp',
    binary: 'leanspec-mcp'
  },
  '@leanspec/http-server': {
    main: '@leanspec/http-server',
    platformPrefix: '@leanspec/http',
    binary: 'leanspec-http'
  }
};

async function fetchPackageInfo(packageName, version) {
  const url = version 
    ? `https://registry.npmjs.org/${packageName}/${version}`
    : `https://registry.npmjs.org/${packageName}/latest`;
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function checkMainPackage(packageName, version) {
  console.log(`\n📦 Checking main package: ${packageName}`);
  
  try {
    const info = await fetchPackageInfo(packageName, version);
    const actualVersion = info.version;
    
    console.log(`  Version: ${actualVersion}`);
    
    // Check optionalDependencies
    const optDeps = info.optionalDependencies || {};
    const platformPackages = Object.keys(optDeps).filter(name => 
      PLATFORMS.some(platform => name.includes(platform))
    );
    
    if (platformPackages.length === 0) {
      console.log(`  ⚠️  No platform packages in optionalDependencies`);
      return { success: false, version: actualVersion };
    }
    
    console.log(`  ✅ Found ${platformPackages.length} platform packages:`);
    for (const pkg of platformPackages.sort()) {
      console.log(`     - ${pkg}@${optDeps[pkg]}`);
    }
    
    return { success: platformPackages.length === PLATFORMS.length, version: actualVersion };
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function checkPlatformPackage(platformPrefix, platform, binary, version) {
  const packageName = `${platformPrefix}-${platform}`;
  
  try {
    const info = await fetchPackageInfo(packageName, version);
    
    // Check files array
    const files = info.files || [];
    const binaryName = platform === 'windows-x64' ? `${binary}.exe` : binary;
    const hasBinary = files.includes(binaryName) || files.includes('*');
    
    if (hasBinary) {
      console.log(`  ✅ ${platform}: ${binaryName}`);
      return { success: true, platform };
    } else {
      console.log(`  ❌ ${platform}: Binary ${binaryName} not in files array`);
      return { success: false, platform, error: 'Binary not in files array' };
    }
  } catch (error) {
    if (error.message.includes('404')) {
      console.log(`  ❌ ${platform}: Package not published`);
      return { success: false, platform, error: 'Not published' };
    }
    console.log(`  ❌ ${platform}: ${error.message}`);
    return { success: false, platform, error: error.message };
  }
}

async function verifyPackage(packageKey, version) {
  const config = PACKAGES[packageKey];
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Verifying: ${config.main}`);
  console.log('='.repeat(60));
  
  // Check main package
  const mainResult = await checkMainPackage(config.main, version);
  
  if (!mainResult.success) {
    return { package: config.main, success: false, details: mainResult };
  }
  
  // Check platform packages
  console.log(`\n📦 Checking platform packages:`);
  const platformResults = await Promise.all(
    PLATFORMS.map(platform => 
      checkPlatformPackage(config.platformPrefix, platform, config.binary, version)
    )
  );
  
  const allPlatformsOk = platformResults.every(r => r.success);
  const missingPlatforms = platformResults.filter(r => !r.success);
  
  if (allPlatformsOk) {
    console.log(`\n✅ All ${PLATFORMS.length} platforms verified!`);
  } else {
    console.log(`\n❌ Missing ${missingPlatforms.length} platform(s):`);
    for (const result of missingPlatforms) {
      console.log(`   - ${result.platform}: ${result.error}`);
    }
  }
  
  return {
    package: config.main,
    success: allPlatformsOk,
    version: mainResult.version,
    platforms: platformResults
  };
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let targetPackage = null;
  let targetVersion = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--package' && args[i + 1]) {
      targetPackage = args[i + 1];
      i++;
    } else if (args[i] === '--version' && args[i + 1]) {
      targetVersion = args[i + 1];
      i++;
    }
  }
  
  console.log('🔍 Verifying npm packages have all platform binaries...\n');
  
  if (targetVersion) {
    console.log(`   Target version: ${targetVersion}`);
  } else {
    console.log(`   Checking latest published versions`);
  }
  
  // Verify packages
  const packagesToCheck = targetPackage 
    ? [targetPackage]
    : Object.keys(PACKAGES);
  
  const results = [];
  for (const pkg of packagesToCheck) {
    const result = await verifyPackage(pkg, targetVersion);
    results.push(result);
  }
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('Summary:');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Verified: ${successful.length}/${results.length}`);
  
  if (successful.length > 0) {
    for (const result of successful) {
      console.log(`   ${result.package}@${result.version}`);
    }
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
    for (const result of failed) {
      console.log(`   ${result.package}`);
      if (result.details?.error) {
        console.log(`      Error: ${result.details.error}`);
      }
      if (result.platforms) {
        const missing = result.platforms.filter(p => !p.success);
        if (missing.length > 0) {
          console.log(`      Missing platforms: ${missing.map(p => p.platform).join(', ')}`);
        }
      }
    }
  }
  
  // Exit with error if any failed
  if (failed.length > 0) {
    console.log(`\n⚠️  Some packages have missing platform binaries!`);
    console.log(`   This means cross-platform builds may have failed.`);
    process.exit(1);
  }
  
  console.log(`\n✨ All packages verified successfully!`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
