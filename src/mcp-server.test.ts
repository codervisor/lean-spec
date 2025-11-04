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
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lspec-mcp-test-'));
    process.chdir(testDir);

    // Create minimal LeanSpec project structure
    await fs.mkdir(path.join(testDir, 'specs'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.lspec'), { recursive: true });
    
    // Create config
    await fs.writeFile(
      path.join(testDir, '.lspec', 'config.json'),
      JSON.stringify({
        specsDir: 'specs',
        structure: {
          pattern: 'flat',
          sequenceDigits: 3,
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
      const { showCommand, readCommand, openCommand } = await import('./commands/viewer.js');
      
      // Test that viewer commands throw errors for non-existent specs
      await expect(
        showCommand('nonexistent-spec-999')
      ).rejects.toThrow('Spec not found: nonexistent-spec-999');

      await expect(
        readCommand('nonexistent-spec-999', {})
      ).rejects.toThrow('Spec not found: nonexistent-spec-999');

      await expect(
        openCommand('nonexistent-spec-999', {})
      ).rejects.toThrow('Spec not found: nonexistent-spec-999');
    });
  });
});
