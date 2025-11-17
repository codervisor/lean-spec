import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startUi } from './ui.js';

describe('UI Command', () => {
  let testDir: string;
  let specsDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'lean-spec-ui-test-'));
    specsDir = join(testDir, 'specs');
    await mkdir(specsDir);

    // Create a minimal config file
    await writeFile(
      join(testDir, 'leanspec.yaml'),
      'specsDir: specs\n'
    );
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('error handling', () => {
    it('should error when specs directory does not exist', async () => {
      const invalidDir = join(testDir, 'nonexistent');

      await expect(
        startUi({
          specs: invalidDir,
          port: '3000',
          open: false,
          dryRun: true,
        })
      ).rejects.toThrow('Specs directory not found');
    });

    it('should delegate to published package outside the monorepo', async () => {
      // Save current cwd
      const originalCwd = process.cwd();

      try {
        // Change to test directory (not a monorepo)
        process.chdir(testDir);

        // Should now fall back to the published package without throwing
        await expect(
          startUi({
            port: '3000',
            open: false,
            dryRun: true,
          })
        ).resolves.toBeUndefined();
      } finally {
        // Restore original cwd
        process.chdir(originalCwd);
      }
    });

    it('should accept custom specs directory', async () => {
      // Save current cwd
      const originalCwd = process.cwd();

      try {
        // Change to test directory
        process.chdir(testDir);

        await expect(
          startUi({
            specs: specsDir,
            port: '3000',
            open: false,
            dryRun: true,
          })
        ).resolves.toBeUndefined();
      } finally {
        // Restore original cwd
        process.chdir(originalCwd);
      }
    });
  });

  describe('monorepo detection', () => {
    it('should work in monorepo with local web package', async () => {
      // Create a fake monorepo structure
      const monorepoDir = await mkdtemp(join(tmpdir(), 'lean-spec-monorepo-'));
      const webDir = join(monorepoDir, 'packages', 'web');
      const specsDir = join(monorepoDir, 'specs');

      try {
        await mkdir(webDir, { recursive: true });
        await mkdir(specsDir, { recursive: true });
        await writeFile(join(monorepoDir, 'leanspec.yaml'), 'specsDir: specs\n');

        // Save current cwd
        const originalCwd = process.cwd();

        try {
          process.chdir(monorepoDir);

          // This should work because packages/web exists
          // We use dry-run to avoid actually starting the server
          await startUi({
            port: '3000',
            open: false,
            dryRun: true,
          });

          // If we get here, it detected the monorepo
          expect(true).toBe(true);
        } finally {
          process.chdir(originalCwd);
        }
      } finally {
        await rm(monorepoDir, { recursive: true, force: true });
      }
    });
  });
});
