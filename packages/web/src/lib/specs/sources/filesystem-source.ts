/**
 * Filesystem-based spec source
 * Reads specs directly from the filesystem with in-memory caching
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';
import type { SpecSource, CachedSpec } from '../types';
import type { Spec } from '../../db/schema';

// Cache TTL from environment
// Default: 0ms in development, 60s in production
const isDev = process.env.NODE_ENV === 'development';
const CACHE_TTL = parseInt(process.env.CACHE_TTL || (isDev ? '0' : '60000'), 10);

/**
 * Filesystem source implementation
 * Reads specs from local filesystem with in-memory caching
 */
export class FilesystemSource implements SpecSource {
  private cache = new Map<string, CachedSpec<Spec | Spec[]>>();
  private specsDir: string;

  constructor(specsDir?: string) {
    // Default to ../../specs relative to the web package
    this.specsDir = specsDir || path.join(process.cwd(), '../../specs');
  }

  /**
   * Get all specs from filesystem
   */
  async getAllSpecs(): Promise<Spec[]> {
    const cacheKey = '__all_specs__';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as Spec[];
    }

    const specs = await this.loadSpecsFromFilesystem();

    this.cache.set(cacheKey, {
      data: specs,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return specs;
  }

  /**
   * Get a single spec by path
   */
  async getSpec(specPath: string): Promise<Spec | null> {
    const cacheKey = `spec:${specPath}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as Spec;
    }

    // Parse spec number from path (e.g., "035" or "035-my-spec")
    const specNum = parseInt(specPath.split('-')[0], 10);
    if (isNaN(specNum)) {
      return null;
    }

    const spec = await this.loadSpecByNumber(specNum);

    if (spec) {
      this.cache.set(cacheKey, {
        data: spec,
        expiresAt: Date.now() + CACHE_TTL,
      });
    }

    return spec;
  }

  /**
   * Get specs by status
   */
  async getSpecsByStatus(status: 'planned' | 'in-progress' | 'complete' | 'archived'): Promise<Spec[]> {
    const allSpecs = await this.getAllSpecs();
    return allSpecs.filter((spec) => spec.status === status);
  }

  /**
   * Search specs by query (basic implementation)
   */
  async searchSpecs(query: string): Promise<Spec[]> {
    const allSpecs = await this.getAllSpecs();
    const lowerQuery = query.toLowerCase();

    return allSpecs.filter((spec) => {
      // Search in spec name, title, and content
      return (
        spec.specName.toLowerCase().includes(lowerQuery) ||
        spec.title?.toLowerCase().includes(lowerQuery) ||
        spec.contentMd.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * Invalidate cache
   */
  invalidateCache(specPath?: string): void {
    if (specPath) {
      this.cache.delete(`spec:${specPath}`);
      // Also invalidate the all specs cache since it contains this spec
      this.cache.delete('__all_specs__');
    } else {
      this.cache.clear();
    }
  }

  /**
   * Load all specs from filesystem
   */
  private async loadSpecsFromFilesystem(): Promise<Spec[]> {
    const specs: Spec[] = [];

    try {
      await fs.access(this.specsDir);
    } catch {
      // Specs directory doesn't exist
      return [];
    }

    // Pattern to match spec directories (2 or more digits followed by dash)
    const specPattern = /^(\d{2,})-/;

    const entries = await fs.readdir(this.specsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'archived') continue; // Skip archived directory

      if (specPattern.test(entry.name)) {
        const specDir = path.join(this.specsDir, entry.name);
        const spec = await this.loadSpecFromDirectory(specDir, entry.name);
        if (spec) {
          specs.push(spec);
        }
      }
    }

    // Sort by spec number
    return specs.sort((a, b) => (a.specNumber || 0) - (b.specNumber || 0));
  }

  /**
   * Load a single spec by number
   */
  private async loadSpecByNumber(specNum: number): Promise<Spec | null> {
    try {
      await fs.access(this.specsDir);
    } catch {
      return null;
    }

    const entries = await fs.readdir(this.specsDir, { withFileTypes: true });
    const specPattern = new RegExp(`^0*${specNum}-`);

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (specPattern.test(entry.name)) {
        const specDir = path.join(this.specsDir, entry.name);
        return await this.loadSpecFromDirectory(specDir, entry.name);
      }
    }

    return null;
  }

  /**
   * Load a spec from a directory
   */
  private async loadSpecFromDirectory(specDir: string, specName: string): Promise<Spec | null> {
    const readmePath = path.join(specDir, 'README.md');

    try {
      const rawContent = await fs.readFile(readmePath, 'utf-8');
      const { data: frontmatter, content: markdownContent } = matter(rawContent);

      if (!frontmatter || !frontmatter.status) {
        return null;
      }

      // Extract spec number from directory name
      const specNumMatch = specName.match(/^(\d+)/);
      const specNumber = specNumMatch ? parseInt(specNumMatch[1], 10) : null;

      // Generate a pseudo-ID for filesystem specs (not stored in DB)
      const id = `fs-${specName}`;

      // Create a Spec object compatible with the schema
      const spec: Spec = {
        id,
        projectId: 'leanspec', // Default project for LeanSpec's own specs
        specNumber,
        specName,
        title: this.extractTitle(markdownContent),
        status: frontmatter.status || 'planned',
        priority: frontmatter.priority || null,
        tags: frontmatter.tags ? JSON.stringify(frontmatter.tags) : null,
        assignee: frontmatter.assignee || null,
        contentMd: markdownContent, // Use parsed content without frontmatter
        contentHtml: null, // Not pre-rendered for filesystem mode
        createdAt: frontmatter.created ? new Date(frontmatter.created) : null,
        updatedAt: frontmatter.updated ? new Date(frontmatter.updated) : null,
        completedAt: frontmatter.completed ? new Date(frontmatter.completed) : null,
        filePath: `specs/${specName}/README.md`,
        githubUrl: `https://github.com/codervisor/lean-spec/tree/main/specs/${specName}/README.md`,
        syncedAt: new Date(), // Current time for filesystem reads
      };

      return spec;
    } catch (error) {
      // File doesn't exist or can't be read
      return null;
    }
  }

  /**
   * Extract title from markdown content (first H1)
   */
  private extractTitle(content: string): string | null {
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^#\s+(.+)$/);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }
}
