/**
 * Project registry for local filesystem projects
 * Manages discovery, storage, and retrieval of local LeanSpec projects
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { parseLeanYaml } from '../../../shared/lean-yaml-parser.js';
import type { LocalProject, ProjectsConfig, ProjectValidation } from './types';

const LEAN_SPEC_FILES = ['leanspec.yaml', 'leanspec.yml', 'lean-spec.yaml', 'lean-spec.yml'];
const DEFAULT_CONFIG_DIR = path.join(homedir(), '.lean-spec');

type StoredProject = Omit<LocalProject, 'lastAccessed'> & { lastAccessed?: string | Date };
interface StoredProjectsFile {
  projects?: StoredProject[];
  recentProjects?: unknown;
}

/**
 * Project Registry - manages local filesystem projects
 */
export class ProjectRegistry {
  private readonly configDir: string;
  private readonly jsonConfigFile: string;
  private readonly legacyConfigFile: string;
  private readonly legacyBackupFile: string;
  private config: ProjectsConfig | null = null;

  constructor(configDir: string = DEFAULT_CONFIG_DIR) {
    this.configDir = configDir;
    this.jsonConfigFile = path.join(configDir, 'projects.json');
    this.legacyConfigFile = path.join(configDir, 'projects.yaml');
    this.legacyBackupFile = `${this.legacyConfigFile}.bak`;
  }

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
    await fs.mkdir(this.configDir, { recursive: true });

    const existing = await this.loadFromJson();
    if (existing) {
      this.config = existing;
      return existing;
    }

    const migrated = await this.migrateLegacyConfig();
    if (migrated) {
      this.config = migrated;
      return migrated;
    }

    this.config = {
      projects: [],
      recentProjects: [],
    };

    return this.config;
  }

  /**
   * Save projects configuration to disk
   */
  private async saveConfig(): Promise<void> {
    if (!this.config) {
      return;
    }

    await fs.mkdir(this.configDir, { recursive: true });

    // Convert Date objects to ISO strings for serialization
    const serializable = {
      projects: this.config.projects.map((p) => ({
        ...p,
        lastAccessed: p.lastAccessed.toISOString(),
      })),
      recentProjects: this.config.recentProjects,
    };

    await fs.writeFile(this.jsonConfigFile, JSON.stringify(serializable, null, 2), 'utf-8');
  }

  private async loadFromJson(): Promise<ProjectsConfig | null> {
    try {
      const content = await fs.readFile(this.jsonConfigFile, 'utf-8');
      const parsed = JSON.parse(content) as StoredProjectsFile;
      return this.normalizeConfig(parsed);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return null;
      }

      if (error instanceof SyntaxError) {
        throw new Error(`Failed to parse ${this.jsonConfigFile}: ${error.message}`);
      }

      throw error;
    }
  }

  private normalizeConfig(input?: StoredProjectsFile | null): ProjectsConfig {
    if (!input) {
      return { projects: [], recentProjects: [] };
    }

    const projects = Array.isArray(input.projects)
      ? input.projects
          .map((project) => this.normalizeProject(project))
          .filter((project): project is LocalProject => project !== null)
      : [];

    const recentProjects = Array.isArray(input.recentProjects)
      ? input.recentProjects.filter((id): id is string => typeof id === 'string')
      : [];

    const projectIds = new Set(projects.map((project) => project.id));
    const filteredRecent = recentProjects.filter((id) => projectIds.has(id));

    return { projects, recentProjects: filteredRecent };
  }

  private normalizeProject(project: StoredProject | null | undefined): LocalProject | null {
    if (!project || typeof project !== 'object') {
      return null;
    }

    if (typeof project.id !== 'string' || typeof project.path !== 'string' || typeof project.specsDir !== 'string') {
      return null;
    }

    return {
      id: project.id,
      name:
        typeof project.name === 'string' && project.name.trim().length > 0
          ? project.name
          : path.basename(project.path),
      path: project.path,
      specsDir: project.specsDir,
      lastAccessed: this.parseDate(project.lastAccessed),
      favorite: typeof project.favorite === 'boolean' ? project.favorite : false,
      color: typeof project.color === 'string' ? project.color : undefined,
      description: typeof project.description === 'string' ? project.description : undefined,
    };
  }

  private parseDate(value: unknown): Date {
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    } else if (value instanceof Date) {
      return value;
    }

    return new Date();
  }

  private async migrateLegacyConfig(): Promise<ProjectsConfig | null> {
    try {
        const content = await fs.readFile(this.legacyConfigFile, 'utf-8');
      const parsed = parseLeanYaml<StoredProjectsFile>(content);
      const config = this.normalizeConfig(parsed);

      this.config = config;
      await this.saveConfig();
      await this.backupLegacyFile();

      return config;
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return null;
      }

        throw new Error(`Failed to migrate ${this.legacyConfigFile}: ${error.message ?? error}`);
    }
  }

  private async backupLegacyFile(): Promise<void> {
    try {
        await fs.rename(this.legacyConfigFile, this.legacyBackupFile);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return;
      }

      if (error?.code === 'EEXIST') {
          await fs.unlink(this.legacyConfigFile).catch(() => undefined);
        return;
      }

      console.warn(`Unable to archive legacy projects.yaml: ${error.message ?? error}`);
    }
  }

  private async readLeanSpecMetadata(projectRoot: string): Promise<{ name?: string; description?: string }> {
    for (const fileName of LEAN_SPEC_FILES) {
      const filePath = path.join(projectRoot, fileName);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = parseLeanYaml<Record<string, unknown>>(content);
        const name = typeof parsed.name === 'string' ? parsed.name : undefined;
        const description = typeof parsed.description === 'string' ? parsed.description : undefined;

        if (name || description) {
          return { name, description };
        }
      } catch (error: any) {
        if (error?.code === 'ENOENT') {
          continue;
        }

        console.warn(`Failed to parse ${filePath}: ${error.message ?? error}`);
      }
    }

    return {};
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

      const leanSpecConfig = await this.readLeanSpecMetadata(normalizedPath);
      if (leanSpecConfig.name) {
        name = leanSpecConfig.name;
      }
      if (leanSpecConfig.description) {
        description = leanSpecConfig.description;
      }

      if (!leanSpecConfig.name || !leanSpecConfig.description) {
        try {
          const packageJson = path.join(normalizedPath, 'package.json');
          const content = await fs.readFile(packageJson, 'utf-8');
          const pkg = JSON.parse(content);
          if (!leanSpecConfig.name && pkg.name) name = pkg.name;
          if (!leanSpecConfig.description && pkg.description) description = pkg.description;
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
    } catch (error) {
      return {
        isValid: false,
        path: projectPath,
        error: error instanceof Error ? error.message : 'Unknown error',
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
   * Find the closest project root with .lean-spec directory
   */
  private async findProjectRoot(startDir: string): Promise<string | null> {
    let currentDir = path.resolve(startDir);
    const { root } = path.parse(currentDir);

    while (true) {
      const leanSpecDir = path.join(currentDir, '.lean-spec');
      try {
        await fs.access(leanSpecDir);
        return currentDir;
      } catch {
        // Not found
      }

      if (currentDir === root) {
        break;
      }
      currentDir = path.dirname(currentDir);
    }
    
    return null;
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<LocalProject[]> {
    const config = await this.loadConfig();

    // Auto-discover if no projects
    if (config.projects.length === 0) {
      const projectRoot = await this.findProjectRoot(process.cwd());
      if (projectRoot) {
        try {
          const project = await this.addProject(projectRoot);
          return [project];
        } catch (e) {
          // Ignore error if auto-add fails
          console.warn('Failed to auto-add default project:', e);
        }
      }
    }

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
   * List directories in a given path
   */
  async listDirectory(dirPath: string = homedir()): Promise<{ name: string; path: string; isDirectory: boolean }[]> {
    try {
      const normalizedPath = path.resolve(dirPath);
      const entries = await fs.readdir(normalizedPath, { withFileTypes: true });
      
      const items = entries
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => ({
          name: entry.name,
          path: path.join(normalizedPath, entry.name),
          isDirectory: true
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Add parent directory entry if not at root
      const parentDir = path.dirname(normalizedPath);
      if (parentDir !== normalizedPath) {
        items.unshift({
          name: '..',
          path: parentDir,
          isDirectory: true
        });
      }

      return items;
    } catch (error: any) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
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
