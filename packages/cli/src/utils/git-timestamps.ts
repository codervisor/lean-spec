import { execSync } from 'node:child_process';
import * as path from 'node:path';
import type { SpecStatus, StatusTransition } from '../frontmatter.js';

export interface GitTimestampData {
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  assignee?: string;
  transitions?: StatusTransition[];
}

/**
 * Check if the current directory is a git repository
 */
export function isGitRepository(): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { 
      stdio: 'ignore',
      encoding: 'utf-8' 
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the timestamp of the first commit that created a file
 */
export function getFirstCommitTimestamp(filePath: string): string | null {
  try {
    // Use --follow to track file renames
    // Use --diff-filter=A to find the commit that added the file
    // Format as ISO 8601 timestamp
    const timestamp = execSync(
      `git log --follow --format="%aI" --diff-filter=A -- "${filePath}" | tail -1`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
    
    return timestamp || null;
  } catch {
    return null;
  }
}

/**
 * Get the timestamp of the most recent commit that modified a file
 */
export function getLastCommitTimestamp(filePath: string): string | null {
  try {
    const timestamp = execSync(
      `git log --format="%aI" -n 1 -- "${filePath}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
    
    return timestamp || null;
  } catch {
    return null;
  }
}

/**
 * Get the timestamp when a spec was marked as complete
 * Searches git history for status changes to "complete"
 */
export function getCompletionTimestamp(filePath: string): string | null {
  try {
    // Get all commits that modified the file, with patch output
    const gitLog = execSync(
      `git log --format="%H|%aI" -p -- "${filePath}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    
    // Parse commits to find status change to complete
    const commits = gitLog.split('\ndiff --git').map(section => section.trim());
    
    for (const commit of commits) {
      if (!commit) continue;
      
      // Extract commit hash and timestamp from header
      const headerMatch = commit.match(/^([a-f0-9]{40})\|([^\n]+)/);
      if (!headerMatch) continue;
      
      const [, , timestamp] = headerMatch;
      
      // Look for status: complete in the diff
      // Check for both YAML frontmatter and inline status changes
      if (
        /^\+status:\s*['"]?complete['"]?/m.test(commit) ||
        /^\+\*\*Status\*\*:.*complete/mi.test(commit)
      ) {
        return timestamp;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Get the author of the first commit (for assignee inference)
 */
export function getFirstCommitAuthor(filePath: string): string | null {
  try {
    const author = execSync(
      `git log --follow --format="%an" --diff-filter=A -- "${filePath}" | tail -1`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
    
    return author || null;
  } catch {
    return null;
  }
}

/**
 * Parse all status transitions from git history
 * Reconstructs the full status change timeline
 */
export function parseStatusTransitions(filePath: string): StatusTransition[] {
  const transitions: StatusTransition[] = [];
  
  try {
    // Get all commits that modified the file, with patch output
    const gitLog = execSync(
      `git log --format="%H|%aI" -p --reverse -- "${filePath}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    
    // Parse commits in chronological order (--reverse)
    const commits = gitLog.split('\ndiff --git').map(section => section.trim());
    
    const validStatuses: SpecStatus[] = ['planned', 'in-progress', 'complete', 'archived'];
    
    for (const commit of commits) {
      if (!commit) continue;
      
      // Extract commit hash and timestamp from header
      const headerMatch = commit.match(/^([a-f0-9]{40})\|([^\n]+)/);
      if (!headerMatch) continue;
      
      const [, , timestamp] = headerMatch;
      
      // Look for status changes in the diff
      // Match: +status: complete or +status: 'complete'
      const statusMatch = commit.match(/^\+status:\s*['"]?(\w+(?:-\w+)?)['"]?/m);
      if (statusMatch) {
        const status = statusMatch[1] as SpecStatus;
        
        // Only record valid status values
        if (validStatuses.includes(status)) {
          // Avoid duplicate consecutive transitions
          const lastTransition = transitions[transitions.length - 1];
          if (!lastTransition || lastTransition.status !== status) {
            transitions.push({ status, at: timestamp });
          }
        }
      }
    }
    
    return transitions;
  } catch {
    return [];
  }
}

/**
 * Extract all git timestamp data for a spec file
 */
export function extractGitTimestamps(
  filePath: string,
  options: {
    includeAssignee?: boolean;
    includeTransitions?: boolean;
  } = {}
): GitTimestampData {
  const data: GitTimestampData = {};
  
  // Core timestamps (always extracted)
  data.created_at = getFirstCommitTimestamp(filePath) ?? undefined;
  data.updated_at = getLastCommitTimestamp(filePath) ?? undefined;
  data.completed_at = getCompletionTimestamp(filePath) ?? undefined;
  
  // Optional fields
  if (options.includeAssignee) {
    const author = getFirstCommitAuthor(filePath);
    if (author) {
      data.assignee = author;
    }
  }
  
  if (options.includeTransitions) {
    const transitions = parseStatusTransitions(filePath);
    if (transitions.length > 0) {
      data.transitions = transitions;
    }
  }
  
  return data;
}

/**
 * Validate that a file exists in git history
 */
export function fileExistsInGit(filePath: string): boolean {
  try {
    execSync(
      `git log -n 1 -- "${filePath}"`,
      { stdio: 'ignore', encoding: 'utf-8' }
    );
    return true;
  } catch {
    return false;
  }
}
