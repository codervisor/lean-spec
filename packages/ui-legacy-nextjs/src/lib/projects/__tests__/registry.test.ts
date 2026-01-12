import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import { mkdtemp, rm, mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { ProjectRegistry } from '../registry';

const TMP_PREFIX = path.join(tmpdir(), 'leanspec-registry-');

async function ensureProjectStructure(projectRoot: string): Promise<void> {
  await mkdir(path.join(projectRoot, '.lean-spec'), { recursive: true });
  await mkdir(path.join(projectRoot, 'specs'), { recursive: true });
}

describe('ProjectRegistry storage', () => {
  let workspaceDir: string;
  let configDir: string;
  let registry: ProjectRegistry;

  beforeEach(async () => {
    workspaceDir = await mkdtemp(TMP_PREFIX);
    configDir = path.join(workspaceDir, '.lean-spec');
    registry = new ProjectRegistry(configDir);
  });

  afterEach(async () => {
    await rm(workspaceDir, { recursive: true, force: true });
  });

  async function createProject(name: string): Promise<string> {
    const projectRoot = await mkdtemp(path.join(workspaceDir, `${name}-`));
    await ensureProjectStructure(projectRoot);
    const packageJson = { name };
    await writeFile(path.join(projectRoot, 'package.json'), JSON.stringify(packageJson, null, 2));
    return projectRoot;
  }

  it('creates projects.json for fresh installs', async () => {
    const projectRoot = await createProject('fresh');
    await registry.addProject(projectRoot);

    const jsonPath = path.join(configDir, 'projects.json');
    const file = JSON.parse(await readFile(jsonPath, 'utf-8'));

    expect(Array.isArray(file.projects)).toBe(true);
    expect(file.projects).toHaveLength(1);
    expect(file.projects[0].name).toBe('fresh');
    await expect(access(path.join(configDir, 'projects.yaml'))).rejects.toThrow();
  });

  it('migrates legacy YAML configs to JSON', async () => {
    const projectRoot = await createProject('legacy');
    const specsDir = path.join(projectRoot, 'specs');

    await mkdir(configDir, { recursive: true });
    const legacyPath = path.join(configDir, 'projects.yaml');
    const legacy = `projects:\n  - id: abc123\n    name: Legacy Project\n    path: ${projectRoot}\n    specsDir: ${specsDir}\n    lastAccessed: '2025-12-10T00:00:00.000Z'\n    favorite: true\nrecentProjects:\n  - abc123\n`;
    await writeFile(legacyPath, legacy, 'utf-8');

    const projects = await registry.getProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('Legacy Project');
    expect(projects[0].favorite).toBe(true);

    const jsonPath = path.join(configDir, 'projects.json');
    const migrated = JSON.parse(await readFile(jsonPath, 'utf-8'));
    expect(migrated.recentProjects).toEqual(['abc123']);
    await expect(access(legacyPath)).rejects.toThrow();
    await expect(access(`${legacyPath}.bak`)).resolves.toBeUndefined();
  });
});
