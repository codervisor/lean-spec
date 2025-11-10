import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import type { LeanSpecConfig } from './config.js';

/**
 * Test helpers for setting up isolated test environments
 */

export interface TestContext {
  tmpDir: string;
  cleanup: () => Promise<void>;
}

/**
 * Create a temporary test directory with LeanSpec structure
 */
export async function createTestEnvironment(): Promise<TestContext> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lean-spec-test-'));

  const cleanup = async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  };

  return { tmpDir, cleanup };
}

/**
 * Initialize a test project with config
 */
export async function initTestProject(
  tmpDir: string,
  config: Partial<LeanSpecConfig> = {}
): Promise<void> {
  const defaultConfig: LeanSpecConfig = {
    template: 'spec-template.md',
    templates: {
      default: 'spec-template.md',
    },
    specsDir: 'specs',
    structure: {
      pattern: '{date}/{seq}-{name}/',
      dateFormat: 'YYYYMMDD',
      sequenceDigits: 3,
      defaultFile: 'README.md',
    },
    features: {
      aiAgents: true,
      examples: true,
    },
  };

  // Deep merge config, especially structure
  const finalConfig: LeanSpecConfig = {
    ...defaultConfig,
    ...config,
    structure: {
      ...defaultConfig.structure,
      ...config.structure,
    },
    frontmatter: config.frontmatter || defaultConfig.frontmatter,
  };

  // Create .lean-spec directory
  const configDir = path.join(tmpDir, '.lean-spec');
  await fs.mkdir(configDir, { recursive: true });

  // Create .lean-spec/templates directory
  const templatesDir = path.join(configDir, 'templates');
  await fs.mkdir(templatesDir, { recursive: true });

  // Create a default template
  const templatePath = path.join(templatesDir, 'spec-template.md');
  const templateContent = `---
status: planned
created: {date}
tags: []
priority: medium
---

# {name}

> **Status**: 📅 Planned · **Created**: {date}

## Overview

<!-- What are we solving? Why now? -->

## Design

<!-- Key decisions and approach -->

## Implementation

<!-- How we'll build it -->

## Testing

<!-- How we'll verify it works -->

## Notes

<!-- Additional context -->
`;
  await fs.writeFile(templatePath, templateContent, 'utf-8');

  // Write config file
  const configPath = path.join(configDir, 'config.json');
  await fs.writeFile(configPath, JSON.stringify(finalConfig, null, 2), 'utf-8');

  // Create specs directory
  const specsDir = path.join(tmpDir, finalConfig.specsDir);
  await fs.mkdir(specsDir, { recursive: true });
}

/**
 * Create a test spec with frontmatter
 */
export async function createTestSpec(
  tmpDir: string,
  date: string,
  name: string,
  frontmatter: Record<string, unknown>,
  content: string = ''
): Promise<string> {
  const specsDir = path.join(tmpDir, 'specs');
  const dateDir = path.join(specsDir, date);
  await fs.mkdir(dateDir, { recursive: true });

  const specDir = path.join(dateDir, name);
  await fs.mkdir(specDir, { recursive: true });

  const specFile = path.join(specDir, 'README.md');
  
  // Build frontmatter (convert dates to strings to avoid Date objects in YAML)
  const lines = ['---'];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.join(', ')}]`);
    } else if (typeof value === 'string') {
      lines.push(`${key}: "${value}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  lines.push('');
  lines.push(content || `# ${name}`);
  lines.push('');
  lines.push('## Overview');
  lines.push('');
  lines.push('Test spec content');
  lines.push('');

  await fs.writeFile(specFile, lines.join('\n'), 'utf-8');

  return specDir;
}

/**
 * Read spec file content
 */
export async function readSpecFile(specDir: string): Promise<string> {
  const specFile = path.join(specDir, 'README.md');
  return await fs.readFile(specFile, 'utf-8');
}

/**
 * Check if directory exists
 */
export async function dirExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get formatted date for today
 */
export function getTestDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}
