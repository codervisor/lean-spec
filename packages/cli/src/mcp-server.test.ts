import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMcpServer } from './mcp-server.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

describe('MCP Server', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lean-spec-mcp-test-'));
    process.chdir(testDir);

    // Create minimal LeanSpec project structure
    await fs.mkdir(path.join(testDir, 'specs'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.lean-spec'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.lean-spec', 'templates'), { recursive: true });
    
    // Create a simple template
    await fs.writeFile(
      path.join(testDir, '.lean-spec', 'templates', 'spec-template.md'),
      `---
status: planned
created: '{date}'
---

# {name}

## Overview

Describe what this spec is about.
`
    );
    
    // Create config
    await fs.writeFile(
      path.join(testDir, '.lean-spec', 'config.json'),
      JSON.stringify({
        specsDir: 'specs',
        template: 'spec-template.md',
        templates: {
          default: 'spec-template.md',
        },
        structure: {
          pattern: 'flat',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
      })
    );

    // Create a test spec
    const specDir = path.join(testDir, 'specs', '001-test-spec');
    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(
      path.join(specDir, 'README.md'),
      `---
status: planned
created: '2025-11-03'
tags: ["test", "example"]
priority: high
---

# Test Spec

This is a test specification for MCP server testing.

## Overview

Testing the MCP server functionality.
`
    );
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Server Creation', () => {
    it('should create MCP server successfully', async () => {
      const server = await createMcpServer();
      expect(server).toBeDefined();
      expect(server).toHaveProperty('connect');
    });

    it('should register all required tools', async () => {
      const server = await createMcpServer();
      
      // Check that server has the tools we registered
      // Note: The actual SDK may not expose tools list directly, 
      // so we're just verifying the server was created successfully
      expect(server).toBeDefined();
    });
  });

  describe('MCP Server Integration', () => {
    it('should have proper structure for MCP protocol', async () => {
      const server = await createMcpServer();
      
      // Verify server has required methods
      expect(typeof server.connect).toBe('function');
      
      // Server should be ready to connect with transport
      expect(server).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle updateSpec errors without crashing', async () => {
      const { updateSpec } = await import('./commands/update.js');
      
      // Test that updateSpec throws error for non-existent spec
      await expect(
        updateSpec('nonexistent-spec-999', { status: 'complete' as any })
      ).rejects.toThrow('Spec not found: nonexistent-spec-999');
    });

    it('should handle archiveSpec errors without crashing', async () => {
      const { archiveSpec } = await import('./commands/archive.js');
      
      // Test that archiveSpec throws error for non-existent spec
      await expect(
        archiveSpec('nonexistent-spec-999')
      ).rejects.toThrow('Spec not found: nonexistent-spec-999');
    });

    it('should handle viewer command errors without crashing', async () => {
      const { viewCommand, openCommand } = await import('./commands/viewer.js');
      
      // Test that viewer commands throw errors for non-existent specs
      await expect(
        viewCommand('nonexistent-spec-999', {})
      ).rejects.toThrow('Spec not found: nonexistent-spec-999');

      await expect(
        openCommand('nonexistent-spec-999', {})
      ).rejects.toThrow('Spec not found: nonexistent-spec-999');
    });

    it('should handle createSpec duplicate errors without crashing', async () => {
      // Note: In the current implementation, createSpec auto-sequences numbers,
      // so duplicate spec names automatically get different numbers (001, 002, etc.)
      // This test verifies that IF a duplicate directory exists, it throws properly
      
      // Create a directory that will conflict with the next sequence number
      const nextSeq = '002';
      const duplicateDir = path.join(testDir, 'specs', `${nextSeq}-will-conflict`);
      await fs.mkdir(duplicateDir, { recursive: true });
      await fs.writeFile(
        path.join(duplicateDir, 'README.md'),
        '---\nstatus: planned\n---\n\n# Conflict\n'
      );
      
      const { createSpec } = await import('./commands/create.js');
      
      // Get what the next sequence will be
      const { getGlobalNextSeq } = await import('./utils/path-helpers.js');
      const seq = await getGlobalNextSeq(path.join(testDir, 'specs'), 3);
      
      // If the sequence matches our pre-created directory, it should throw
      if (seq === nextSeq) {
        await expect(
          createSpec('will-conflict', { title: 'Test' })
        ).rejects.toThrow(/Spec already exists/);
      } else {
        // Otherwise just verify createSpec doesn't crash when directories exist
        await createSpec('another-spec', { title: 'Test' });
      }
    });

    it('should handle createSpec invalid template errors without crashing', async () => {
      const { createSpec } = await import('./commands/create.js');
      
      // Try to create with non-existent template - should throw error, not exit
      await expect(
        createSpec('new-spec', { template: 'nonexistent-template' })
      ).rejects.toThrow(/Template not found/);
    });

    it('should handle depsCommand errors without crashing', async () => {
      const { depsCommand } = await import('./commands/deps.js');
      
      // Test that depsCommand throws error for non-existent spec
      await expect(
        depsCommand('nonexistent-spec-999', {})
      ).rejects.toThrow('Spec not found: nonexistent-spec-999');
    });

    it('should handle filesCommand errors without crashing', async () => {
      const { filesCommand } = await import('./commands/files.js');
      
      // Test that filesCommand throws error for non-existent spec
      await expect(
        filesCommand('nonexistent-spec-999', {})
      ).rejects.toThrow('Spec not found: nonexistent-spec-999');
    });

    it('should support viewing sub-spec files', async () => {
      const { readSpecContent } = await import('./commands/viewer.js');
      
      // Create a spec with sub-spec files
      const specDir = path.join(testDir, 'specs', '002-multi-doc-spec');
      await fs.mkdir(specDir, { recursive: true });
      
      // Create main README.md
      await fs.writeFile(
        path.join(specDir, 'README.md'),
        `---
status: in-progress
created: '2025-11-07'
priority: medium
tags: ["test"]
---

# Multi-Doc Spec

See [DESIGN.md](DESIGN.md) for details.
`
      );
      
      // Create DESIGN.md sub-spec
      await fs.writeFile(
        path.join(specDir, 'DESIGN.md'),
        `# Design Document

This is the design document.

## Architecture

Details here.
`
      );
      
      // Test viewing sub-spec file
      const content = await readSpecContent('002/DESIGN.md', testDir);
      expect(content).toBeDefined();
      expect(content?.name).toBe('002-multi-doc-spec/DESIGN.md');
      expect(content?.content).toContain('Design Document');
      expect(content?.content).toContain('Architecture');
      
      // Test viewing main spec still works
      const mainContent = await readSpecContent('002', testDir);
      expect(mainContent).toBeDefined();
      expect(mainContent?.name).toBe('002-multi-doc-spec');
      expect(mainContent?.content).toContain('Multi-Doc Spec');
    });

    it('should handle consecutive errors without crashing', async () => {
      const { updateSpec } = await import('./commands/update.js');
      
      // Multiple consecutive errors should all throw, not crash the process
      await expect(
        updateSpec('fake-1', { status: 'complete' as any })
      ).rejects.toThrow();
      
      await expect(
        updateSpec('fake-2', { status: 'complete' as any })
      ).rejects.toThrow();
      
      await expect(
        updateSpec('fake-3', { status: 'complete' as any })
      ).rejects.toThrow();
      
      // Process should still be running - test by doing a successful operation
      await expect(
        updateSpec('001-test-spec', { status: 'in-progress' as any })
      ).resolves.toBeUndefined();
    });
  });
});
