import dayjs from 'dayjs';
import type { SpecInfo } from '../spec-loader.js';

export interface CompletionMetrics {
  score: number; // 0-100 (simple completion rate: complete/total * 100)
  totalSpecs: number;
  activeSpecs: number;
  completeSpecs: number;
  criticalIssues: string[];
  warnings: string[];
}

/**
 * Check if a spec is critical and overdue
 */
function isCriticalOverdue(spec: SpecInfo): boolean {
  if (spec.frontmatter.status === 'complete' || spec.frontmatter.status === 'archived') {
    return false;
  }
  
  if (!spec.frontmatter.due) {
    return false;
  }
  
  const isOverdue = dayjs(spec.frontmatter.due).isBefore(dayjs(), 'day');
  const isCritical = spec.frontmatter.priority === 'critical' || spec.frontmatter.priority === 'high';
  
  return isOverdue && isCritical;
}

/**
 * Check if a spec has been in progress for too long (> 7 days)
 */
function isLongRunning(spec: SpecInfo): boolean {
  if (spec.frontmatter.status !== 'in-progress') {
    return false;
  }
  
  const updatedAt = spec.frontmatter.updated || spec.frontmatter.updated_at || spec.frontmatter.created || spec.frontmatter.created_at;
  
  if (!updatedAt) {
    return false;
  }
  
  const daysSinceUpdate = dayjs().diff(dayjs(updatedAt), 'day');
  return daysSinceUpdate > 7;
}

/**
 * Calculate completion metrics for a set of specs
 * Score is simple completion rate: (complete / total) * 100
 */
export function calculateCompletion(specs: SpecInfo[]): CompletionMetrics {
  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  
  // Filter out archived specs (by path or status)
  // Specs in archived/ folder may have status: complete, so check path too
  const activeAndCompleteSpecs = specs.filter(s => 
    s.frontmatter.status !== 'archived' && 
    !s.path.startsWith('archived/')
  );
  
  for (const spec of activeAndCompleteSpecs) {
    // Detect critical issues
    if (isCriticalOverdue(spec)) {
      criticalIssues.push(spec.path);
    }
    
    // Detect warnings (long-running WIP)
    if (isLongRunning(spec)) {
      warnings.push(spec.path);
    }
  }
  
  // Count active and complete specs (excluding archived by path and status)
  const activeSpecs = specs.filter(
    s => (s.frontmatter.status === 'planned' || s.frontmatter.status === 'in-progress') &&
         !s.path.startsWith('archived/')
  );
  const completeSpecs = specs.filter(s => 
    s.frontmatter.status === 'complete' && 
    !s.path.startsWith('archived/')
  );
  
  // Calculate simple completion rate (avoid division by zero)
  const totalSpecs = activeAndCompleteSpecs.length;
  const score = totalSpecs > 0 ? Math.round((completeSpecs.length / totalSpecs) * 100) : 0;
  
  return {
    score,
    totalSpecs,
    activeSpecs: activeSpecs.length,
    completeSpecs: completeSpecs.length,
    criticalIssues,
    warnings,
  };
}

/**
 * Get a completion status indicator based on score
 */
export function getCompletionStatus(score: number): { emoji: string; label: string; color: string } {
  if (score >= 70) {
    return { emoji: '✓', label: 'Good', color: 'green' };
  } else if (score >= 40) {
    return { emoji: '⚠', label: 'Fair', color: 'yellow' };
  } else {
    return { emoji: '✗', label: 'Needs Attention', color: 'red' };
  }
}
