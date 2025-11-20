/**
 * Project registry for local filesystem projects
 * Manages discovery, storage, and retrieval of local LeanSpec projects
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import yaml from 'js-yaml';
import type { LocalProject, ProjectsConfig, ProjectValidation } from './types';

const PROJECTS_CONFIG_FILE = path.join(homedir(), '.lean-spec', 'projects.yaml');

/**
 * Project Registry - manages local filesystem projects
 */
export class ProjectRegistry {
  private config: ProjectsConfig | null = null;

  /**
   * Generate a unique ID for a project based on its path
   */
  private generateProjectId(projectPath: string): string {
    return createHash('sha256')
      .update(projectPath)
      .digest('hex')
      .substring(0, 12);
  }

  /**
   * Load projects configuration from disk
   */
  private async loadConfig(): Promise<ProjectsConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      const configDir = path.dirname(PROJECTS_CONFIG_FILE);
      await fs.mkdir(configDir, { recursive: true });

      const fileContent = await fs.readFile(PROJECTS_CONFIG_FILE, 'utf-8');
      const parsed = yaml.load(fileContent) as any;
      
      // Convert date strings back to Date objects
      const projects = (parsed.projects || []).map((p: any) => ({
        ...p,
        lastAccessed: p.lastAccessed ? new Date(p.lastAccessed) : new Date(),
      }));

      this.config = {
        projects,
        recentProjects: parsed.recentProjects || [],
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create empty config
        this.config = {
          projects: [],
          recentProjects: [],
        };
      } else {
        throw error;
      }
    }

    return this.config;
  }

  /**
   * Save projects configuration to disk
   */
  private async saveConfig(): Promise<void> {
    if (!this.config) {
      return;
    }

    const configDir = path.dirname(PROJECTS_CONFIG_FILE);
    await fs.mkdir(configDir, { recursive: true });

    // Convert Date objects to ISO strings for serialization
    const serializable = {
      projects: this.config.projects.map((p) => ({
        ...p,
        lastAccessed: p.lastAccessed.toISOString(),
      })),
      recentProjects: this.config.recentProjects,
    };

    const yamlContent = yaml.dump(serializable, {
      indent: 2,
      lineWidth: 100,
    });

    await fs.writeFile(PROJECTS_CONFIG_FILE, yamlContent, 'utf-8');
  }

  /**
   * Validate a project path and extract metadata
   */
  async validateProject(projectPath: string): Promise<ProjectValidation> {
    try {
      const normalizedPath = path.resolve(projectPath);
      
      // Check if path exists
      const stats = await fs.stat(normalizedPath);
      if (!stats.isDirectory()) {
        return {
          isValid: false,
          path: normalizedPath,
          error: 'Path is not a directory',
        };
      }

      // Look for .lean-spec directory or specs directory
      let specsDir: string | undefined;
      const leanSpecDir = path.join(normalizedPath, '.lean-spec');
      const specsOnlyDir = path.join(normalizedPath, 'specs');
      
      try {
        await fs.access(leanSpecDir);
        // If .lean-spec exists, check for specs inside or alongside
        const specsInLeanSpec = path.join(leanSpecDir, '../specs');
        try {
          await fs.access(specsInLeanSpec);
          specsDir = specsInLeanSpec;
        } catch {
          specsDir = specsOnlyDir;
        }
      } catch {
        // No .lean-spec, check for specs directory
        try {
          await fs.access(specsOnlyDir);
          specsDir = specsOnlyDir;
        } catch {
          return {
            isValid: false,
            path: normalizedPath,
            error: 'No .lean-spec directory or specs directory found',
          };
        }
      }

      // Try to read project name and description from various sources
      let name = path.basename(normalizedPath);
      let description: string | undefined;

      // Try leanspec.yaml
      try {
        const leanspecYaml = path.join(normalizedPath, 'leanspec.yaml');
        const content = await fs.readFile(leanspecYaml, 'utf-8');
        const config = yaml.load(content) as any;
        if (config.name) name = config.name;
        if (config.description) description = config.description;
      } catch {
        // Try package.json
        try {
          const packageJson = path.join(normalizedPath, 'package.json');
          const content = await fs.readFile(packageJson, 'utf-8');
          const pkg = JSON.parse(content);
          if (pkg.name) name = pkg.name;
          if (pkg.description) description = pkg.description;
        } catch {
          // Use directory name as fallback
        }
      }

      return {
        isValid: true,
        path: normalizedPath,
        specsDir: path.resolve(specsDir),
        name,
        description,
      };
    } catch (error: any) {
      return {
        isValid: false,
        path: projectPath,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Add a project to the registry
   */
  async addProject(projectPath: string, options?: { favorite?: boolean; color?: string }): Promise<LocalProject> {
    const validation = await this.validateProject(projectPath);
    
    if (!validation.isValid) {
      throw new Error(`Invalid project: ${validation.error}`);
    }

    const config = await this.loadConfig();
    const projectId = this.generateProjectId(validation.path);
    
    // Check if project already exists
    const existingIndex = config.projects.findIndex((p) => p.id === projectId);
    
    const project: LocalProject = {
      id: projectId,
      name: validation.name!,
      path: validation.path,
      specsDir: validation.specsDir!,
      lastAccessed: new Date(),
      favorite: options?.favorite || false,
      color: options?.color,
      description: validation.description,
    };

    if (existingIndex >= 0) {
      // Update existing project
      config.projects[existingIndex] = project;
    } else {
      // Add new project
      config.projects.push(project);
    }

    // Update recent projects
    this.updateRecentProjects(config, projectId);

    await this.saveConfig();
    return project;
  }

  /**
   * Remove a project from the registry
   */
  async removeProject(projectId: string): Promise<void> {
    const config = await this.loadConfig();
    
    config.projects = config.projects.filter((p) => p.id !== projectId);
    config.recentProjects = config.recentProjects.filter((id) => id !== projectId);
    
    await this.saveConfig();
  }

  /**
   * Get a project by ID
   */
  async getProject(projectId: string): Promise<LocalProject | null> {
    const config = await this.loadConfig();
    return config.projects.find((p) => p.id === projectId) || null;
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<LocalProject[]> {
    const config = await this.loadConfig();
    return config.projects;
  }

  /**
   * Update project lastAccessed timestamp and add to recent projects
   */
  async touchProject(projectId: string): Promise<void> {
    const config = await this.loadConfig();
    
    const project = config.projects.find((p) => p.id === projectId);
    if (!project) {
      return;
    }

    project.lastAccessed = new Date();
    this.updateRecentProjects(config, projectId);
    
    await this.saveConfig();
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(projectId: string): Promise<boolean> {
    const config = await this.loadConfig();
    
    const project = config.projects.find((p) => p.id === projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    project.favorite = !project.favorite;
    await this.saveConfig();
    
    return project.favorite;
  }

  /**
   * Update project metadata
   */
  async updateProject(projectId: string, updates: Partial<Pick<LocalProject, 'name' | 'color' | 'description'>>): Promise<LocalProject> {
    const config = await this.loadConfig();
    
    const project = config.projects.find((p) => p.id === projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    Object.assign(project, updates);
    await this.saveConfig();
    
    return project;
  }

  /**
   * Discover projects in a directory tree
   */
  async discoverProjects(rootDir: string, maxDepth: number = 3): Promise<ProjectValidation[]> {
    const discovered: ProjectValidation[] = [];
    
    const self = this;
    async function scan(dir: string, depth: number) {
      if (depth > maxDepth) {
        return;
      }

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (!entry.isDirectory()) {
            continue;
          }

          // Skip common ignore patterns
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) {
            continue;
          }

          const fullPath = path.join(dir, entry.name);
          
          // Check if this directory is a LeanSpec project
          const validation = await self.validateProject(fullPath);
          if (validation.isValid) {
            discovered.push(validation);
          } else {
            // Recurse into subdirectories
            await scan(fullPath, depth + 1);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }

    await scan(rootDir, 0);
    return discovered;
  }

  /**
   * Get recent projects
   */
  async getRecentProjects(limit: number = 10): Promise<LocalProject[]> {
    const config = await this.loadConfig();
    
    return config.recentProjects
      .slice(0, limit)
      .map((id) => config.projects.find((p) => p.id === id))
      .filter((p): p is LocalProject => p !== undefined);
  }

  /**
   * Get favorite projects
   */
  async getFavoriteProjects(): Promise<LocalProject[]> {
    const config = await this.loadConfig();
    return config.projects.filter((p) => p.favorite);
  }

  /**
   * Update recent projects list
   */
  private updateRecentProjects(config: ProjectsConfig, projectId: string): void {
    // Remove if already in list
    config.recentProjects = config.recentProjects.filter((id) => id !== projectId);
    
    // Add to front
    config.recentProjects.unshift(projectId);
    
    // Keep only last 10
    config.recentProjects = config.recentProjects.slice(0, 10);
  }

  /**
   * Invalidate cached config
   */
  invalidateCache(): void {
    this.config = null;
  }
}

// Singleton instance
export const projectRegistry = new ProjectRegistry();
