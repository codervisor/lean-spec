/**
 * Multi-project filesystem source
 * Extends FilesystemSource to support multiple local projects
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';
import type { SpecSource, CachedSpec } from '../types';
import type { Spec } from '../../db/schema';
import { projectRegistry } from '../../projects';

// Cache TTL from environment
const isDev = process.env.NODE_ENV === 'development';
const CACHE_TTL = parseInt(process.env.CACHE_TTL || (isDev ? '0' : '60000'), 10);

/**
 * Multi-project filesystem source
 * Manages specs from multiple local filesystem projects
 */
export class MultiProjectFilesystemSource implements SpecSource {
  private cache = new Map<string, CachedSpec<Spec | Spec[]>>();

  /**
   * Get all specs from a specific project
   */
  async getAllSpecs(projectId?: string): Promise<Spec[]> {
    if (!projectId) {
      return [];
    }

    const cacheKey = `project:${projectId}:all`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as Spec[];
    }

    const project = await projectRegistry.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const specs = await this.loadSpecsFromDirectory(project.specsDir, projectId);

    this.cache.set(cacheKey, {
      data: specs,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return specs;
  }

  /**
   * Get a single spec by path
   */
  async getSpec(specPath: string, projectId?: string): Promise<Spec | null> {
    if (!projectId) {
      return null;
    }

    const cacheKey = `project:${projectId}:spec:${specPath}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as Spec;
    }

    const project = await projectRegistry.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Parse spec number from path
    const specNum = parseInt(specPath.split('-')[0], 10);
    if (isNaN(specNum)) {
      return null;
    }

    const spec = await this.loadSpecByNumber(project.specsDir, specNum, projectId);

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
  async getSpecsByStatus(
    status: 'planned' | 'in-progress' | 'complete' | 'archived',
    projectId?: string
  ): Promise<Spec[]> {
    const allSpecs = await this.getAllSpecs(projectId);
    return allSpecs.filter((spec) => spec.status === status);
  }

  /**
   * Search specs
   */
  async searchSpecs(query: string, projectId?: string): Promise<Spec[]> {
    const allSpecs = await this.getAllSpecs(projectId);
    const lowerQuery = query.toLowerCase();

    return allSpecs.filter((spec) => {
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
      // Invalidate specific spec cache across all projects
      for (const key of this.cache.keys()) {
        if (key.includes(`:spec:${specPath}`)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  /**
   * Load all specs from a directory
   */
  private async loadSpecsFromDirectory(specsDir: string, projectId: string): Promise<Spec[]> {
    try {
      const entries = await fs.readdir(specsDir, { withFileTypes: true });
      const specs: Spec[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        // Check if directory matches spec pattern (number-name)
        const match = entry.name.match(/^(\d+)-(.+)$/);
        if (!match) {
          continue;
        }

        const specNum = parseInt(match[1], 10);
        const specName = match[2];
        const specDir = path.join(specsDir, entry.name);
        const readmePath = path.join(specDir, 'README.md');

        try {
          const content = await fs.readFile(readmePath, 'utf-8');
          const spec = this.parseSpec(content, specNum, specName, readmePath, projectId);
          if (spec) {
            specs.push(spec);
          }
        } catch (error) {
          console.warn(`Failed to read spec ${entry.name}:`, error);
        }
      }

      return specs.sort((a, b) => (a.specNumber || 0) - (b.specNumber || 0));
    } catch (error) {
      console.error(`Error loading specs from ${specsDir}:`, error);
      return [];
    }
  }

  /**
   * Load a specific spec by number
   */
  private async loadSpecByNumber(
    specsDir: string,
    specNum: number,
    projectId: string
  ): Promise<Spec | null> {
    try {
      const entries = await fs.readdir(specsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const match = entry.name.match(/^(\d+)-(.+)$/);
        if (!match) {
          continue;
        }

        const entryNum = parseInt(match[1], 10);
        if (entryNum === specNum) {
          const specName = match[2];
          const specDir = path.join(specsDir, entry.name);
          const readmePath = path.join(specDir, 'README.md');

          const content = await fs.readFile(readmePath, 'utf-8');
          return this.parseSpec(content, specNum, specName, readmePath, projectId);
        }
      }

      return null;
    } catch (error) {
      console.error(`Error loading spec ${specNum}:`, error);
      return null;
    }
  }

  /**
   * Parse spec from markdown content
   */
  private parseSpec(
    content: string,
    specNum: number,
    specName: string,
    filePath: string,
    projectId: string
  ): Spec | null {
    try {
      const { data: frontmatter, content: markdown } = matter(content);

      // Extract title from markdown (first h1)
      const titleMatch = markdown.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : frontmatter.title || specName;

      return {
        id: `${projectId}:${specNum.toString().padStart(3, '0')}`,
        projectId,
        specNumber: specNum,
        specName,
        title,
        status: frontmatter.status,
        priority: frontmatter.priority,
        tags: frontmatter.tags ? JSON.stringify(frontmatter.tags) : null,
        assignee: frontmatter.assignee || null,
        contentMd: content,
        contentHtml: null,
        createdAt: frontmatter.created_at ? new Date(frontmatter.created_at) : null,
        updatedAt: frontmatter.updated_at ? new Date(frontmatter.updated_at) : null,
        completedAt: frontmatter.completed_at ? new Date(frontmatter.completed_at) : null,
        filePath,
        githubUrl: null,
        syncedAt: new Date(),
      };
    } catch (error) {
      console.error(`Error parsing spec ${specName}:`, error);
      return null;
    }
  }
}
