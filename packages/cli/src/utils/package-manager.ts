import { existsSync } from 'node:fs';
import { join } from 'node:path';

export type PackageManager = 'pnpm' | 'yarn' | 'npm';

export function detectPackageManager(baseDir: string = process.cwd()): PackageManager {
  const userAgent = process.env.npm_config_user_agent || '';

  if (userAgent.includes('pnpm')) {
    return 'pnpm';
  }

  if (userAgent.includes('yarn')) {
    return 'yarn';
  }

  if (userAgent.includes('npm')) {
    return 'npm';
  }

  if (existsSync(join(baseDir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  if (existsSync(join(baseDir, 'yarn.lock'))) {
    return 'yarn';
  }

  if (existsSync(join(baseDir, 'package-lock.json'))) {
    return 'npm';
  }

  return 'npm';
}
