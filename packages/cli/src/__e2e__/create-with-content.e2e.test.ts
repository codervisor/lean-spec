/**
 * E2E Tests: create with content options
 *
 * Tests the new content input options for spec creation:
 * - --content option for passing full markdown content
 * - --file option for reading content from file
 * - stdin input for piped content
 * - Precedence rules between different content sources
 * - Frontmatter merging and CLI option overrides
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import {
  createE2EEnvironment,
  initProject,
  execCli,
  execCliWithInput,
  fileExists,
  dirExists,
  readFile,
  writeFile,
  parseFrontmatter,
  type E2EContext,
} from './e2e-helpers.js';

describe('E2E: create with content options', () => {
  let ctx: E2EContext;

  beforeEach(async () => {
    ctx = await createE2EEnvironment();
    initProject(ctx.tmpDir, { yes: true });
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('--content option', () => {
    it('should create spec with full markdown content', async () => {
      const content = `# My Feature Spec

## Overview

This is a complete spec with custom content.

## Design

Custom design section.

## Implementation

Custom implementation notes.`;

      const result = execCli(['create', 'my-feature', '--content', content], { cwd: ctx.tmpDir });
      expect(result.exitCode).toBe(0);

      const specDir = path.join(ctx.tmpDir, 'specs', '001-my-feature');
      expect(await dirExists(specDir)).toBe(true);

      const readmePath = path.join(specDir, 'README.md');
      const fileContent = await readFile(readmePath);

      // Should contain the custom content
      expect(fileContent).toContain('This is a complete spec with custom content');
      expect(fileContent).toContain('Custom design section');
      expect(fileContent).toContain('Custom implementation notes');
    });

    it('should create spec with content that has frontmatter', async () => {
      const content = `---
status: in-progress
priority: high
tags:
  - feature
  - v2.0
---

# My Feature

This spec has frontmatter included.`;

      const result = execCli(['create', 'my-feature', '--content', content], { cwd: ctx.tmpDir });
      expect(result.exitCode).toBe(0);

      const readmePath = path.join(ctx.tmpDir, 'specs', '001-my-feature', 'README.md');
      const fileContent = await readFile(readmePath);
      const frontmatter = parseFrontmatter(fileContent);

      // Frontmatter from content should be present
      expect(frontmatter.status).toBe('in-progress');
      expect(frontmatter.priority).toBe('high');
      expect(frontmatter.tags).toContain('feature');
      expect(frontmatter.tags).toContain('v2.0');
    });

    it('should override content frontmatter with CLI options', async () => {
      const content = `---
status: in-progress
priority: high
tags:
  - old-tag
---

# My Feature

Content with frontmatter.`;

      const result = execCli([
        'create',
        'my-feature',
        '--content',
        content,
        '--priority',
        'critical',
        '--tags',
        'new-tag,urgent',
      ], { cwd: ctx.tmpDir });
      expect(result.exitCode).toBe(0);

      const readmePath = path.join(ctx.tmpDir, 'specs', '001-my-feature', 'README.md');
      const fileContent = await readFile(readmePath);
      const frontmatter = parseFrontmatter(fileContent);

      // CLI options should override content frontmatter
      expect(frontmatter.priority).toBe('critical');
      expect(frontmatter.tags).toContain('new-tag');
      expect(frontmatter.tags).toContain('urgent');
      expect(frontmatter.tags).not.toContain('old-tag');
    });

    it('should use template frontmatter when content has no frontmatter', async () => {
      const content = `# Simple Content

Just body content, no frontmatter.`;

      const result = execCli(['create', 'my-feature', '--content', content], { cwd: ctx.tmpDir });
      expect(result.exitCode).toBe(0);

      const readmePath = path.join(ctx.tmpDir, 'specs', '001-my-feature', 'README.md');
      const fileContent = await readFile(readmePath);
      const frontmatter = parseFrontmatter(fileContent);

      // Should have default frontmatter from template
      expect(frontmatter.status).toBeDefined();
      expect(frontmatter.created_at).toBeDefined();
    });
  });

  describe('--file option', () => {
    it('should create spec from file content', async () => {
      const contentFilePath = path.join(ctx.tmpDir, 'spec-content.md');
      const content = `# Feature from File

## Overview

This content was read from a file.

## Design

File-based design.`;

      await writeFile(contentFilePath, content);

      const result = execCli(['create', 'my-feature', '--file', 'spec-content.md'], { cwd: ctx.tmpDir });
      expect(result.exitCode).toBe(0);

      const readmePath = path.join(ctx.tmpDir, 'specs', '001-my-feature', 'README.md');
      const fileContent = await readFile(readmePath);

      expect(fileContent).toContain('This content was read from a file');
      expect(fileContent).toContain('File-based design');
    });

    it('should handle absolute file paths', async () => {
      const contentFilePath = path.join(ctx.tmpDir, 'absolute-content.md');
      const content = `# Absolute Path Content

Content from absolute path.`;

      await writeFile(contentFilePath, content);

      const result = execCli(['create', 'my-feature', '--file', contentFilePath], { cwd: ctx.tmpDir });
      expect(result.exitCode).toBe(0);

      const readmePath = path.join(ctx.tmpDir, 'specs', '001-my-feature', 'README.md');
      const fileContent = await readFile(readmePath);

      expect(fileContent).toContain('Content from absolute path');
    });

    it('should error on non-existent file', async () => {
      const result = execCli(['create', 'my-feature', '--file', 'non-existent.md'], { cwd: ctx.tmpDir });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('File not found');
    });

    it('should error when path is a directory', async () => {
      const dirPath = path.join(ctx.tmpDir, 'some-directory');
      await fs.mkdir(dirPath, { recursive: true });

      const result = execCli(['create', 'my-feature', '--file', 'some-directory'], { cwd: ctx.tmpDir });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('directory');
    });
  });

  describe('stdin input', () => {
    it('should create spec from stdin', async () => {
      const content = `# Feature from Stdin

## Overview

This content was piped via stdin.`;

      const result = await execCliWithInput(['create', 'my-feature'], content, { cwd: ctx.tmpDir });
      expect(result.exitCode).toBe(0);

      const readmePath = path.join(ctx.tmpDir, 'specs', '001-my-feature', 'README.md');
      const fileContent = await readFile(readmePath);

      expect(fileContent).toContain('This content was piped via stdin');
    });
  });

  describe('precedence rules', () => {
    it('should prefer --file over --content', async () => {
      const fileContentPath = path.join(ctx.tmpDir, 'from-file.md');
      await writeFile(fileContentPath, '# Content from file');

      const result = execCli([
        'create',
        'my-feature',
        '--file',
        'from-file.md',
        '--content',
        '# Content from argument',
      ], { cwd: ctx.tmpDir });
      expect(result.exitCode).toBe(0);

      const readmePath = path.join(ctx.tmpDir, 'specs', '001-my-feature', 'README.md');
      const fileContent = await readFile(readmePath);

      // Should use file content, not --content argument
      expect(fileContent).toContain('Content from file');
      expect(fileContent).not.toContain('Content from argument');
    });

    it('should prefer --content over --description', async () => {
      const result = execCli([
        'create',
        'my-feature',
        '--content',
        '# Full content body',
        '--description',
        'This description should be ignored',
      ], { cwd: ctx.tmpDir });
      expect(result.exitCode).toBe(0);

      const readmePath = path.join(ctx.tmpDir, 'specs', '001-my-feature', 'README.md');
      const fileContent = await readFile(readmePath);

      // Should use content, not description
      expect(fileContent).toContain('Full content body');
      expect(fileContent).not.toContain('This description should be ignored');
    });

    it('should use --description when no content/file provided', async () => {
      const result = execCli([
        'create',
        'my-feature',
        '--description',
        'This description should be used',
      ], { cwd: ctx.tmpDir });
      expect(result.exitCode).toBe(0);

      const readmePath = path.join(ctx.tmpDir, 'specs', '001-my-feature', 'README.md');
      const fileContent = await readFile(readmePath);

      expect(fileContent).toContain('This description should be used');
    });
  });

  describe('edge cases', () => {
    it('should handle empty content gracefully', async () => {
      // Create a file with minimal but valid content
      const contentFilePath = path.join(ctx.tmpDir, 'minimal-content.md');
      const content = `# Minimal Content`;
      await writeFile(contentFilePath, content);

      const result = execCli(['create', 'my-feature', '--file', 'minimal-content.md'], { cwd: ctx.tmpDir });
      expect(result.exitCode).toBe(0);

      const specDir = path.join(ctx.tmpDir, 'specs', '001-my-feature');
      expect(await dirExists(specDir)).toBe(true);

      const readmePath = path.join(specDir, 'README.md');
      const fileContent = await readFile(readmePath);
      const frontmatter = parseFrontmatter(fileContent);

      // Should still have frontmatter
      expect(frontmatter.status).toBeDefined();
      
      // Should contain the minimal content
      expect(fileContent).toContain('Minimal Content');
    });

    it('should handle large content', async () => {
      // Create content larger than 10KB
      const largeContent = `# Large Content\n\n` + 'A'.repeat(15000);

      const result = execCli(['create', 'my-feature', '--content', largeContent], { cwd: ctx.tmpDir });
      expect(result.exitCode).toBe(0);

      const readmePath = path.join(ctx.tmpDir, 'specs', '001-my-feature', 'README.md');
      const fileContent = await readFile(readmePath);

      expect(fileContent).toContain('Large Content');
      expect(fileContent.length).toBeGreaterThan(15000);
    });

    it('should handle content with special characters', async () => {
      // Write content to file to avoid shell escaping issues
      const contentFilePath = path.join(ctx.tmpDir, 'special-content.md');
      const content = `# Special Characters Test

Content with $pecial ch@racters & symbols: <>, [], {}, |, \\, /, etc.

Code blocks with backticks:
\`\`\`javascript
const x = \`template \${string}\`;
\`\`\``;

      await writeFile(contentFilePath, content);

      const result = execCli(['create', 'my-feature', '--file', 'special-content.md'], { cwd: ctx.tmpDir });
      expect(result.exitCode).toBe(0);

      const readmePath = path.join(ctx.tmpDir, 'specs', '001-my-feature', 'README.md');
      const fileContent = await readFile(readmePath);

      expect(fileContent).toContain('$pecial ch@racters');
      expect(fileContent).toContain('template ${string}');
    });
  });

  describe('combined with other options', () => {
    it('should work with --title and --content', async () => {
      const content = `# Will be replaced

This is the content body.`;

      const result = execCli([
        'create',
        'my-feature',
        '--content',
        content,
        '--title',
        'Custom Title',
      ], { cwd: ctx.tmpDir });
      expect(result.exitCode).toBe(0);

      const readmePath = path.join(ctx.tmpDir, 'specs', '001-my-feature', 'README.md');
      const fileContent = await readFile(readmePath);

      expect(fileContent).toContain('This is the content body');
    });

    it('should work with --assignee and --content', async () => {
      const content = `# Feature Content

Content for the spec.`;

      const result = execCli([
        'create',
        'my-feature',
        '--content',
        content,
        '--assignee',
        'john.doe',
      ], { cwd: ctx.tmpDir });
      expect(result.exitCode).toBe(0);

      const readmePath = path.join(ctx.tmpDir, 'specs', '001-my-feature', 'README.md');
      const fileContent = await readFile(readmePath);
      const frontmatter = parseFrontmatter(fileContent);

      expect(frontmatter.assignee).toBe('john.doe');
      expect(fileContent).toContain('Content for the spec');
    });
  });
});
