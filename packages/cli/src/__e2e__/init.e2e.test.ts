/**
 * E2E Tests: init command scenarios
 *
 * Tests the `lean-spec init` command in realistic scenarios including:
 * - Fresh initialization
 * - Re-initialization (upgrade mode)
 * - Force reset
 * - AGENTS.md preservation and creation
 *
 * These tests catch bugs like the "AGENTS.md preserved" false positive
 * that unit tests missed because they mock filesystem interactions.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import {
  createE2EEnvironment,
  execCli,
  initProject,
  fileExists,
  dirExists,
  readFile,
  writeFile,
  remove,
  type E2EContext,
} from './e2e-helpers.js';

describe('E2E: lean-spec init', () => {
  let ctx: E2EContext;

  beforeEach(async () => {
    ctx = await createE2EEnvironment();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('fresh initialization', () => {
    it('should initialize a new project with -y flag', async () => {
      const result = initProject(ctx.tmpDir, { yes: true });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('LeanSpec initialized');

      // Verify directory structure
      expect(await dirExists(path.join(ctx.tmpDir, '.lean-spec'))).toBe(true);
      expect(await dirExists(path.join(ctx.tmpDir, 'specs'))).toBe(true);
      expect(await fileExists(path.join(ctx.tmpDir, '.lean-spec', 'config.json'))).toBe(true);
      expect(await fileExists(path.join(ctx.tmpDir, 'AGENTS.md'))).toBe(true);
    });

    it('should create AGENTS.md with project name substitution', async () => {
      initProject(ctx.tmpDir, { yes: true });

      const agentsContent = await readFile(path.join(ctx.tmpDir, 'AGENTS.md'));

      // Should have substituted {project_name}
      expect(agentsContent).not.toContain('{project_name}');
      // Should contain LeanSpec instructions
      expect(agentsContent.toLowerCase()).toContain('leanspec');
    });

    it('should create config with standard template defaults', async () => {
      initProject(ctx.tmpDir, { yes: true });

      const configContent = await readFile(path.join(ctx.tmpDir, '.lean-spec', 'config.json'));
      const config = JSON.parse(configContent);

      expect(config.template).toBe('spec-template.md');
      expect(config.specsDir).toBe('specs');
      expect(config.structure.pattern).toBe('flat');
    });

    it('should create templates directory with spec template', async () => {
      initProject(ctx.tmpDir, { yes: true });

      const templatesDir = path.join(ctx.tmpDir, '.lean-spec', 'templates');
      expect(await dirExists(templatesDir)).toBe(true);
      expect(await fileExists(path.join(templatesDir, 'spec-template.md'))).toBe(true);
    });
  });

  describe('re-initialization (upgrade mode)', () => {
    it('should upgrade existing config without destroying specs', async () => {
      // First: initialize
      initProject(ctx.tmpDir, { yes: true });

      // Create a spec
      execCli(['create', 'my-feature'], { cwd: ctx.tmpDir });

      // Verify spec exists
      const specsDir = path.join(ctx.tmpDir, 'specs');
      const specsBefore = await (await import('node:fs/promises')).readdir(specsDir);
      expect(specsBefore.length).toBeGreaterThan(0);

      // Re-initialize with -y (should upgrade)
      const result = initProject(ctx.tmpDir, { yes: true });

      expect(result.exitCode).toBe(0);
      expect(result.stdout.toLowerCase()).toContain('upgrade');

      // Specs should still exist
      const specsAfter = await (await import('node:fs/promises')).readdir(specsDir);
      expect(specsAfter.length).toBe(specsBefore.length);
    });

    it('should preserve existing AGENTS.md during upgrade', async () => {
      // Initialize
      initProject(ctx.tmpDir, { yes: true });

      // Modify AGENTS.md with custom content
      const agentsPath = path.join(ctx.tmpDir, 'AGENTS.md');
      const customContent = '# Custom Agent Instructions\n\nMy custom instructions here.';
      await writeFile(agentsPath, customContent);

      // Re-initialize (upgrade mode)
      const result = initProject(ctx.tmpDir, { yes: true });

      expect(result.exitCode).toBe(0);

      // AGENTS.md should still have custom content
      const agentsAfter = await readFile(agentsPath);
      expect(agentsAfter).toBe(customContent);
    });

    it('should recreate AGENTS.md if missing during upgrade', async () => {
      // Initialize
      initProject(ctx.tmpDir, { yes: true });

      // Delete AGENTS.md (simulating accidental deletion or old setup)
      await remove(path.join(ctx.tmpDir, 'AGENTS.md'));
      expect(await fileExists(path.join(ctx.tmpDir, 'AGENTS.md'))).toBe(false);

      // Re-initialize (upgrade mode)
      const result = initProject(ctx.tmpDir, { yes: true });

      expect(result.exitCode).toBe(0);

      // AGENTS.md should be recreated
      expect(await fileExists(path.join(ctx.tmpDir, 'AGENTS.md'))).toBe(true);

      // Output should indicate it was created
      expect(result.stdout.toLowerCase()).toContain('agents.md');
    });
  });

  describe('force re-initialization', () => {
    it('should reset config with --force flag', async () => {
      // Initialize
      initProject(ctx.tmpDir, { yes: true });

      // Modify config
      const configPath = path.join(ctx.tmpDir, '.lean-spec', 'config.json');
      const config = JSON.parse(await readFile(configPath));
      config.customSetting = 'custom-value';
      await writeFile(configPath, JSON.stringify(config, null, 2));

      // Remove AGENTS.md to avoid AI-assisted merge prompt which hangs in tests
      await remove(path.join(ctx.tmpDir, 'AGENTS.md'));

      // Force re-init with -y to skip interactive prompts
      const result = execCli(['init', '-f', '-y'], { cwd: ctx.tmpDir });

      expect(result.exitCode).toBe(0);

      // Config should be reset (custom setting gone)
      const configAfter = JSON.parse(await readFile(configPath));
      expect(configAfter.customSetting).toBeUndefined();
    });

    it('should preserve specs directory with --force flag', async () => {
      // Initialize and create a spec
      initProject(ctx.tmpDir, { yes: true });
      execCli(['create', 'important-spec'], { cwd: ctx.tmpDir });

      // Get spec count
      const specsDir = path.join(ctx.tmpDir, 'specs');
      const specsBefore = await (await import('node:fs/promises')).readdir(specsDir);

      // Remove AGENTS.md to avoid AI-assisted merge prompt which hangs in tests
      await remove(path.join(ctx.tmpDir, 'AGENTS.md'));

      // Force re-init with -y to skip interactive prompts
      const result = execCli(['init', '-f', '-y'], { cwd: ctx.tmpDir });

      expect(result.exitCode).toBe(0);

      // Specs should still exist
      const specsAfter = await (await import('node:fs/promises')).readdir(specsDir);
      expect(specsAfter.length).toBeGreaterThanOrEqual(specsBefore.length);
    });
  });

  describe('template selection', () => {
    it('should use standard template with --template standard', async () => {
      const result = execCli(['init', '-y', '--template', 'standard'], { cwd: ctx.tmpDir });

      expect(result.exitCode).toBe(0);

      const config = JSON.parse(await readFile(path.join(ctx.tmpDir, '.lean-spec', 'config.json')));
      expect(config.template).toBe('spec-template.md');
    });

    it('should use detailed template with --template detailed', async () => {
      const result = execCli(['init', '-y', '--template', 'detailed'], { cwd: ctx.tmpDir });

      expect(result.exitCode).toBe(0);

      const config = JSON.parse(await readFile(path.join(ctx.tmpDir, '.lean-spec', 'config.json')));
      expect(config.template).toBe('README.md');
    });

    it('should handle legacy minimal template name', async () => {
      const result = execCli(['init', '-y', '--template', 'minimal'], { cwd: ctx.tmpDir });

      // Should not fail, should fall back to standard
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toLowerCase()).toContain('standard');
    });

    it('should handle legacy enterprise template name', async () => {
      const result = execCli(['init', '-y', '--template', 'enterprise'], { cwd: ctx.tmpDir });

      // Should not fail, should fall back to detailed
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toLowerCase()).toContain('detailed');
    });
  });

  describe('agent tool symlinks', () => {
    it('should create symlinks with --agent-tools flag', async () => {
      const result = execCli(['init', '-y', '--agent-tools', 'claude,gemini'], { cwd: ctx.tmpDir });

      expect(result.exitCode).toBe(0);

      // Check for symlinks (or files on Windows)
      expect(await fileExists(path.join(ctx.tmpDir, 'AGENTS.md'))).toBe(true);

      // These should exist as symlinks or files
      const claudePath = path.join(ctx.tmpDir, 'CLAUDE.md');
      const geminiPath = path.join(ctx.tmpDir, 'GEMINI.md');

      // At least one should be created (depends on OS symlink support)
      const claudeExists = await fileExists(claudePath);
      const geminiExists = await fileExists(geminiPath);
      expect(claudeExists || geminiExists).toBe(true);
    });

    it('should not create symlinks with --agent-tools none', async () => {
      const result = execCli(['init', '-y', '--agent-tools', 'none'], { cwd: ctx.tmpDir });

      expect(result.exitCode).toBe(0);
      expect(await fileExists(path.join(ctx.tmpDir, 'AGENTS.md'))).toBe(true);

      // CLAUDE.md and GEMINI.md should NOT exist
      expect(await fileExists(path.join(ctx.tmpDir, 'CLAUDE.md'))).toBe(false);
      expect(await fileExists(path.join(ctx.tmpDir, 'GEMINI.md'))).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should fail gracefully on permission error', async () => {
      // Skip on non-Unix systems
      if (process.platform === 'win32') {
        return;
      }

      // Make directory read-only
      const { chmodSync } = await import('node:fs');
      const readOnlyDir = path.join(ctx.tmpDir, 'readonly');
      await (await import('node:fs/promises')).mkdir(readOnlyDir);
      chmodSync(readOnlyDir, 0o444);

      try {
        const result = execCli(['init', '-y'], { cwd: readOnlyDir });
        // Should fail
        expect(result.exitCode).not.toBe(0);
      } finally {
        // Restore permissions for cleanup
        chmodSync(readOnlyDir, 0o755);
      }
    });
  });
});

/**
 * Regression tests for specific bugs
 *
 * Add a test here whenever we fix a bug in init.
 * Name the test after the issue/PR number when available.
 */
describe('E2E: init regressions', () => {
  let ctx: E2EContext;

  beforeEach(async () => {
    ctx = await createE2EEnvironment();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('REGRESSION: should not report "AGENTS.md preserved" when it was deleted', async () => {
    // This test catches the bug where init reported "AGENTS.md preserved"
    // even when the file was missing and needed to be recreated.

    // Setup: init, then delete AGENTS.md
    initProject(ctx.tmpDir, { yes: true });
    await remove(path.join(ctx.tmpDir, 'AGENTS.md'));

    // Action: run init again
    const result = initProject(ctx.tmpDir, { yes: true });

    // Assert: should indicate AGENTS.md was created, not preserved
    expect(result.exitCode).toBe(0);

    // The file must exist
    expect(await fileExists(path.join(ctx.tmpDir, 'AGENTS.md'))).toBe(true);

    // The output contains "What was preserved:" header which always appears,
    // but "Your AGENTS.md" line should NOT appear since it was deleted and recreated.
    // It should show "AGENTS.md created (was missing)" in the "What was updated:" section
    const output = result.stdout.toLowerCase();
    
    // Should say it was created/missing, not that it was preserved
    expect(output).toContain('agents.md created');
    // "Your AGENTS.md" should NOT appear in the preserved section
    expect(output).not.toContain('your agents.md');
  });

  it('REGRESSION: should preserve missing templates during upgrade', async () => {
    // Setup: init, then delete templates
    initProject(ctx.tmpDir, { yes: true });
    const templatesDir = path.join(ctx.tmpDir, '.lean-spec', 'templates');
    await remove(templatesDir);

    // Action: run init again (upgrade mode)
    const result = initProject(ctx.tmpDir, { yes: true });

    expect(result.exitCode).toBe(0);

    // Templates should be recreated
    expect(await dirExists(templatesDir)).toBe(true);
    expect(await fileExists(path.join(templatesDir, 'spec-template.md'))).toBe(true);
  });
});
