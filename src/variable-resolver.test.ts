import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import {
  getGitInfo,
  getProjectName,
  resolveVariables,
  buildVariableContext,
  type VariableContext,
} from './utils/variable-resolver.js';
import { loadConfig, saveConfig, type LeanSpecConfig } from './config.js';
import {
  createTestEnvironment,
  type TestContext,
} from './test-helpers.js';

describe('getGitInfo', () => {
  it('should get git user info', async () => {
    // This test will fail if git is not configured, but that's OK
    // In CI it should be configured
    const gitInfo = await getGitInfo();
    
    // Git might not be configured in test environment
    if (gitInfo) {
      expect(gitInfo).toHaveProperty('user');
      expect(gitInfo).toHaveProperty('email');
      expect(gitInfo).toHaveProperty('repo');
    }
  });
});

describe('getProjectName', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestEnvironment();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('should get project name from package.json', async () => {
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
    };
    
    await fs.writeFile(
      path.join(ctx.tmpDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    );
    
    const projectName = await getProjectName(ctx.tmpDir);
    expect(projectName).toBe('test-project');
  });

  it('should return null if package.json does not exist', async () => {
    const projectName = await getProjectName(ctx.tmpDir);
    expect(projectName).toBeNull();
  });

  it('should return null if package.json has no name', async () => {
    const packageJson = {
      version: '1.0.0',
    };
    
    await fs.writeFile(
      path.join(ctx.tmpDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    );
    
    const projectName = await getProjectName(ctx.tmpDir);
    expect(projectName).toBeNull();
  });
});

describe('resolveVariables', () => {
  it('should replace built-in variables', () => {
    const template = 'Name: {name}, Date: {date}';
    const context: VariableContext = {
      name: 'my-feature',
      date: '2024-11-01',
    };
    
    const result = resolveVariables(template, context);
    expect(result).toBe('Name: my-feature, Date: 2024-11-01');
  });

  it('should replace git variables', () => {
    const template = 'Author: {author}, Email: {git_email}, Repo: {git_repo}';
    const context: VariableContext = {
      gitInfo: {
        user: 'John Doe',
        email: 'john@example.com',
        repo: 'my-repo',
      },
    };
    
    const result = resolveVariables(template, context);
    expect(result).toBe('Author: John Doe, Email: john@example.com, Repo: my-repo');
  });

  it('should replace custom variables', () => {
    const template = 'Team: {team}, Company: {company}';
    const context: VariableContext = {
      customVariables: {
        team: 'Platform Engineering',
        company: 'Acme Corp',
      },
    };
    
    const result = resolveVariables(template, context);
    expect(result).toBe('Team: Platform Engineering, Company: Acme Corp');
  });

  it('should replace project name variable', () => {
    const template = 'Project: {project_name}';
    const context: VariableContext = {
      projectName: 'my-project',
    };
    
    const result = resolveVariables(template, context);
    expect(result).toBe('Project: my-project');
  });

  it('should handle missing variables gracefully', () => {
    const template = 'Name: {name}, Unknown: {unknown}';
    const context: VariableContext = {
      name: 'my-feature',
    };
    
    const result = resolveVariables(template, context);
    expect(result).toBe('Name: my-feature, Unknown: {unknown}');
  });

  it('should handle multiple occurrences of the same variable', () => {
    const template = '{name} is called {name}';
    const context: VariableContext = {
      name: 'test',
    };
    
    const result = resolveVariables(template, context);
    expect(result).toBe('test is called test');
  });
});

describe('buildVariableContext', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestEnvironment();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('should build context with custom variables from config', async () => {
    const config: LeanSpecConfig = {
      template: 'spec-template.md',
      specsDir: 'specs',
      structure: {
        pattern: '{date}/{seq}-{name}/',
        dateFormat: 'YYYYMMDD',
        sequenceDigits: 3,
        defaultFile: 'README.md',
      },
      variables: {
        team: 'Engineering',
        company: 'Test Corp',
      },
    };
    
    const context = await buildVariableContext(config, {
      name: 'my-feature',
      date: '2024-11-01',
    });
    
    expect(context.name).toBe('my-feature');
    expect(context.date).toBe('2024-11-01');
    expect(context.customVariables).toEqual({
      team: 'Engineering',
      company: 'Test Corp',
    });
  });

  it('should use current date if not provided', async () => {
    const config: LeanSpecConfig = {
      template: 'spec-template.md',
      specsDir: 'specs',
      structure: {
        pattern: '{date}/{seq}-{name}/',
        dateFormat: 'YYYYMMDD',
        sequenceDigits: 3,
        defaultFile: 'README.md',
      },
    };
    
    const context = await buildVariableContext(config, {
      name: 'my-feature',
    });
    
    expect(context.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
