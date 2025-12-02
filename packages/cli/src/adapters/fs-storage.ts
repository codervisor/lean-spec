/**
 * File system storage adapter for Node.js
 * Implements SpecStorage interface using fs operations
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { SpecStorage } from '@leanspec/core';

export class FileSystemStorage implements SpecStorage {
  /**
   * Read a file as UTF-8 string
   */
  async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  /**
   * Write content to a file
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Check if a file or directory exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all files in a directory (non-recursive)
   * Returns full paths
   */
  async listFiles(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isFile())
        .map(entry => path.join(dirPath, entry.name));
    } catch {
      return [];
    }
  }

  /**
   * List all subdirectories in a directory (non-recursive)
   * Returns full paths
   */
  async listDirs(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(dirPath, entry.name));
    } catch {
      return [];
    }
  }

  /**
   * Get file metadata
   */
  async getFileStats(filePath: string): Promise<{ size: number; modified: Date }> {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      modified: stats.mtime,
    };
  }
}
