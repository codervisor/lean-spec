import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import type { LeanSpecConfig } from '../config.js';

export interface GitInfo {
  user: string;
  email: string;
  repo: string;
}

export interface VariableContext {
  name?: string;
  date?: string;
  projectName?: string;
  gitInfo?: GitInfo;
  customVariables?: Record<string, string>;
}

/**
 * Get git information from the repository
 */
export async function getGitInfo(): Promise<GitInfo | null> {
  try {
    const user = execSync('git config user.name', { encoding: 'utf-8' }).trim();
    const email = execSync('git config user.email', { encoding: 'utf-8' }).trim();
    
    // Get repository name from remote URL
    let repo = '';
    try {
      const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();
      // Extract repo name from various formats:
      // https://github.com/user/repo.git -> repo
      // git@github.com:user/repo.git -> repo
      const match = remoteUrl.match(/\/([^/]+?)(?:\.git)?$/);
      if (match) {
        repo = match[1];
      }
    } catch {
      // No remote configured
      repo = '';
    }
    
    return { user, email, repo };
  } catch {
    // Git not configured or not in a git repository
    return null;
  }
}

/**
 * Get project name from package.json
 */
export async function getProjectName(cwd: string = process.cwd()): Promise<string | null> {
  try {
    const packageJsonPath = path.join(cwd, 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);
    return packageJson.name || null;
  } catch {
    // No package.json or invalid JSON
    return null;
  }
}

/**
 * Resolve variables in a string
 */
export function resolveVariables(
  template: string,
  context: VariableContext
): string {
  let result = template;
  
  // Built-in variables
  if (context.name) {
    result = result.replace(/{name}/g, context.name);
  }
  
  if (context.date) {
    result = result.replace(/{date}/g, context.date);
  }
  
  if (context.projectName) {
    result = result.replace(/{project_name}/g, context.projectName);
  }
  
  // Git variables
  if (context.gitInfo) {
    result = result.replace(/{author}/g, context.gitInfo.user);
    result = result.replace(/{git_user}/g, context.gitInfo.user);
    result = result.replace(/{git_email}/g, context.gitInfo.email);
    result = result.replace(/{git_repo}/g, context.gitInfo.repo);
  }
  
  // Custom variables from config
  if (context.customVariables) {
    for (const [key, value] of Object.entries(context.customVariables)) {
      // Escape special regex characters in key to prevent RegExp injection
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`\\{${escapedKey}\\}`, 'g');
      result = result.replace(pattern, value);
    }
  }
  
  return result;
}

/**
 * Build a complete variable context
 */
export async function buildVariableContext(
  config: LeanSpecConfig,
  options: {
    name?: string;
    date?: string;
  } = {}
): Promise<VariableContext> {
  const context: VariableContext = {
    name: options.name,
    date: options.date || new Date().toISOString().split('T')[0],
    customVariables: config.variables || {},
  };
  
  // Load project name
  context.projectName = (await getProjectName()) || undefined;
  
  // Load git info
  context.gitInfo = await getGitInfo() || undefined;
  
  return context;
}
