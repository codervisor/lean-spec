import chalk from 'chalk';
import type { SpecStatus, SpecPriority } from '../frontmatter.js';

/**
 * Get emoji for spec status
 */
export function getStatusEmoji(status: SpecStatus): string {
  switch (status) {
    case 'planned': return chalk.gray('📅');
    case 'in-progress': return chalk.yellow('🔨');
    case 'complete': return chalk.green('✅');
    case 'archived': return chalk.gray('📦');
    default: return '';
  }
}

/**
 * Get label for spec priority
 */
export function getPriorityLabel(priority: SpecPriority): string {
  switch (priority) {
    case 'low': return chalk.gray('low');
    case 'medium': return chalk.blue('med');
    case 'high': return chalk.yellow('high');
    case 'critical': return chalk.red('CRIT');
    default: return '';
  }
}
