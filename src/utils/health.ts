import dayjs from 'dayjs';
import type { SpecInfo } from '../spec-loader.js';
import type { SpecPriority } from '../frontmatter.js';

export interface HealthMetrics {
  score: number; // 0-100
  totalSpecs: number;
  activeSpecs: number;
  completeSpecs: number;
  criticalIssues: string[];
  warnings: string[];
}

/**
 * Get priority weight for health score calculation
 * critical=4, high=3, medium=2, low=1, none=1
 */
function priorityWeight(priority?: SpecPriority): number {
  switch (priority) {
    case 'critical':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 1;
  }
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
 * Calculate health metrics for a set of specs
 * Health score is weighted by priority:
 * - Critical specs count 4x
 * - High specs count 3x
 * - Medium specs count 2x
 * - Low/none specs count 1x
 * 
 * Score = (weighted_complete / weighted_total) * 100
 */
export function calculateHealth(specs: SpecInfo[]): HealthMetrics {
  let totalWeight = 0;
  let completeWeight = 0;
  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  
  for (const spec of specs) {
    // Skip archived specs in health calculation
    if (spec.frontmatter.status === 'archived') {
      continue;
    }
    
    const weight = priorityWeight(spec.frontmatter.priority);
    totalWeight += weight;
    
    if (spec.frontmatter.status === 'complete') {
      completeWeight += weight;
    }
    
    // Detect critical issues
    if (isCriticalOverdue(spec)) {
      criticalIssues.push(spec.path);
    }
    
    // Detect warnings (long-running WIP)
    if (isLongRunning(spec)) {
      warnings.push(spec.path);
    }
  }
  
  // Calculate score (avoid division by zero)
  const score = totalWeight > 0 ? Math.round((completeWeight / totalWeight) * 100) : 0;
  
  // Count active and complete specs (excluding archived)
  const activeSpecs = specs.filter(
    s => s.frontmatter.status === 'planned' || s.frontmatter.status === 'in-progress'
  );
  const completeSpecs = specs.filter(s => s.frontmatter.status === 'complete');
  
  return {
    score,
    totalSpecs: specs.filter(s => s.frontmatter.status !== 'archived').length,
    activeSpecs: activeSpecs.length,
    completeSpecs: completeSpecs.length,
    criticalIssues,
    warnings,
  };
}

/**
 * Get a health status indicator based on score
 */
export function getHealthStatus(score: number): { emoji: string; label: string; color: string } {
  if (score >= 70) {
    return { emoji: '✓', label: 'Good', color: 'green' };
  } else if (score >= 40) {
    return { emoji: '⚠', label: 'Fair', color: 'yellow' };
  } else {
    return { emoji: '✗', label: 'Needs Attention', color: 'red' };
  }
}
