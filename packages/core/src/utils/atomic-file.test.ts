import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFile, readFile, readdir, unlink, mkdir, rm } from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { atomicWriteFile } from './atomic-file.js';

describe('atomicWriteFile', () => {
  let tmpDir: string;
  let testFilePath: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tmpDir = path.join(os.tmpdir(), `atomic-file-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    testFilePath = path.join(tmpDir, 'test.md');
  });

  afterEach(async () => {
    // Cleanup temporary directory
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('should write file atomically', async () => {
    const content = 'Test content for atomic write';
    
    await atomicWriteFile(testFilePath, content);
    
    const readContent = await readFile(testFilePath, 'utf-8');
    expect(readContent).toBe(content);
  });

  it('should overwrite existing file', async () => {
    // Write initial content
    await writeFile(testFilePath, 'old content', 'utf-8');
    
    // Overwrite with atomic write
    const newContent = 'new content';
    await atomicWriteFile(testFilePath, newContent);
    
    const readContent = await readFile(testFilePath, 'utf-8');
    expect(readContent).toBe(newContent);
  });

  it('should handle multi-line content', async () => {
    const content = `---
status: planned
created: '2025-12-09'
---

# Test Spec

## Overview

This is a test.`;
    
    await atomicWriteFile(testFilePath, content);
    
    const readContent = await readFile(testFilePath, 'utf-8');
    expect(readContent).toBe(content);
  });

  it('should handle unicode content', async () => {
    const content = '测试内容 🚀 UTF-8 ✓';
    
    await atomicWriteFile(testFilePath, content);
    
    const readContent = await readFile(testFilePath, 'utf-8');
    expect(readContent).toBe(content);
  });

  it('should not leave temp files on success', async () => {
    await atomicWriteFile(testFilePath, 'content');
    
    const files = await readdir(tmpDir);
    const tempFiles = files.filter(f => f.includes('.tmp-'));
    
    expect(tempFiles).toHaveLength(0);
  });

  it('should cleanup temp file on write error', async () => {
    // Create a mock that throws on rename
    const invalidPath = path.join(tmpDir, 'nonexistent', 'test.md');
    
    await expect(atomicWriteFile(invalidPath, 'content')).rejects.toThrow();
    
    // Check that no temp files are left behind
    const files = await readdir(tmpDir);
    const tempFiles = files.filter(f => f.includes('.tmp-'));
    
    expect(tempFiles).toHaveLength(0);
  });

  it('should handle concurrent writes to different files', async () => {
    const file1 = path.join(tmpDir, 'file1.md');
    const file2 = path.join(tmpDir, 'file2.md');
    const file3 = path.join(tmpDir, 'file3.md');
    
    // Write concurrently
    await Promise.all([
      atomicWriteFile(file1, 'content 1'),
      atomicWriteFile(file2, 'content 2'),
      atomicWriteFile(file3, 'content 3'),
    ]);
    
    // Verify all files written correctly
    expect(await readFile(file1, 'utf-8')).toBe('content 1');
    expect(await readFile(file2, 'utf-8')).toBe('content 2');
    expect(await readFile(file3, 'utf-8')).toBe('content 3');
    
    // No temp files left
    const files = await readdir(tmpDir);
    const tempFiles = files.filter(f => f.includes('.tmp-'));
    expect(tempFiles).toHaveLength(0);
  });

  it('should handle concurrent writes to same file', async () => {
    // Simulate race condition: multiple concurrent updates
    const updates = [
      atomicWriteFile(testFilePath, 'update 1'),
      atomicWriteFile(testFilePath, 'update 2'),
      atomicWriteFile(testFilePath, 'update 3'),
    ];
    
    await Promise.all(updates);
    
    // File should exist and contain one of the updates (last write wins)
    const content = await readFile(testFilePath, 'utf-8');
    expect(['update 1', 'update 2', 'update 3']).toContain(content);
    
    // No temp files left
    const files = await readdir(tmpDir);
    const tempFiles = files.filter(f => f.includes('.tmp-'));
    expect(tempFiles).toHaveLength(0);
  });

  it('should handle empty content', async () => {
    await atomicWriteFile(testFilePath, '');
    
    const content = await readFile(testFilePath, 'utf-8');
    expect(content).toBe('');
  });

  it('should handle large content', async () => {
    // Generate ~100KB of content
    const largeContent = 'x'.repeat(100_000);
    
    await atomicWriteFile(testFilePath, largeContent);
    
    const content = await readFile(testFilePath, 'utf-8');
    expect(content).toBe(largeContent);
  });

  it('should propagate write errors', async () => {
    // Try to write to a read-only location (should fail)
    const readOnlyPath = '/root/test.md'; // Non-writable on most systems
    
    await expect(atomicWriteFile(readOnlyPath, 'content')).rejects.toThrow();
  });
});
