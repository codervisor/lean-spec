import dayjs from 'dayjs';
import type { SpecInfo } from '../spec-loader.js';

export interface Insight {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  specs: string[];
}

/**
 * Generate smart insights for specs that need attention
 * Returns top 5 most important insights
 */
export function generateInsights(specs: SpecInfo[]): Insight[] {
  const insights: Insight[] = [];
  
  // 1. Critical overdue specs
  const criticalOverdue = specs.filter(s => 
    s.frontmatter.priority === 'critical' &&
    s.frontmatter.due && 
    dayjs(s.frontmatter.due).isBefore(dayjs(), 'day') &&
    s.frontmatter.status !== 'complete' &&
    s.frontmatter.status !== 'archived'
  );
  
  if (criticalOverdue.length > 0) {
    insights.push({
      severity: 'critical',
      message: `${criticalOverdue.length} critical spec${criticalOverdue.length > 1 ? 's' : ''} overdue`,
      specs: criticalOverdue.map(s => s.path),
    });
  }
  
  // 2. High priority overdue specs
  const highOverdue = specs.filter(s => 
    s.frontmatter.priority === 'high' &&
    s.frontmatter.due && 
    dayjs(s.frontmatter.due).isBefore(dayjs(), 'day') &&
    s.frontmatter.status !== 'complete' &&
    s.frontmatter.status !== 'archived'
  );
  
  if (highOverdue.length > 0) {
    insights.push({
      severity: 'warning',
      message: `${highOverdue.length} high priority spec${highOverdue.length > 1 ? 's' : ''} overdue`,
      specs: highOverdue.map(s => s.path),
    });
  }
  
  // 3. Long-running WIP (in-progress > 7 days)
  const longRunning = specs.filter(s => {
    if (s.frontmatter.status !== 'in-progress') {
      return false;
    }
    
    const updatedAt = s.frontmatter.updated || s.frontmatter.updated_at || s.frontmatter.created || s.frontmatter.created_at;
    
    if (!updatedAt) {
      return false;
    }
    
    const daysSinceUpdate = dayjs().diff(dayjs(updatedAt), 'day');
    return daysSinceUpdate > 7;
  });
  
  if (longRunning.length > 0) {
    insights.push({
      severity: 'warning',
      message: `${longRunning.length} spec${longRunning.length > 1 ? 's' : ''} in-progress > 7 days`,
      specs: longRunning.map(s => s.path),
    });
  }
  
  // 4. Critical specs not started
  const criticalNotStarted = specs.filter(s =>
    s.frontmatter.priority === 'critical' &&
    s.frontmatter.status === 'planned'
  );
  
  if (criticalNotStarted.length > 0) {
    insights.push({
      severity: 'warning',
      message: `${criticalNotStarted.length} critical spec${criticalNotStarted.length > 1 ? 's' : ''} not started`,
      specs: criticalNotStarted.map(s => s.path),
    });
  }
  
  // 5. High priority specs not started (if we have room)
  const highNotStarted = specs.filter(s =>
    s.frontmatter.priority === 'high' &&
    s.frontmatter.status === 'planned'
  );
  
  if (highNotStarted.length > 0 && insights.length < 5) {
    insights.push({
      severity: 'info',
      message: `${highNotStarted.length} high priority spec${highNotStarted.length > 1 ? 's' : ''} not started`,
      specs: highNotStarted.map(s => s.path),
    });
  }
  
  // Return top 5 insights
  return insights.slice(0, 5);
}

/**
 * Get detailed insight for a specific spec (with days overdue, etc.)
 */
export function getSpecInsightDetails(spec: SpecInfo): string | null {
  // Check if overdue
  if (spec.frontmatter.due && 
      dayjs(spec.frontmatter.due).isBefore(dayjs(), 'day') &&
      spec.frontmatter.status !== 'complete' &&
      spec.frontmatter.status !== 'archived') {
    const daysOverdue = dayjs().diff(dayjs(spec.frontmatter.due), 'day');
    return `overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}`;
  }
  
  // Check if long-running
  if (spec.frontmatter.status === 'in-progress') {
    const updatedAt = spec.frontmatter.updated || spec.frontmatter.updated_at || spec.frontmatter.created || spec.frontmatter.created_at;
    
    if (updatedAt) {
      const daysSinceUpdate = dayjs().diff(dayjs(updatedAt), 'day');
      if (daysSinceUpdate > 7) {
        return `in-progress for ${daysSinceUpdate} days`;
      }
    }
  }
  
  return null;
}
