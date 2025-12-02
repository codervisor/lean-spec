/**
 * Shared color scheme for status and priority across all commands
 * Ensures consistent visual representation throughout the CLI
 */

import chalk from 'chalk';
import type { SpecStatus, SpecPriority } from '../frontmatter.js';

/**
 * Status color and display configuration
 * Colors: planned (blue), in-progress (yellow), complete (green), archived (gray)
 */
export const STATUS_CONFIG: Record<SpecStatus, { 
  emoji: string; 
  label: string; 
  colorFn: (s: string) => string;
  badge: (s?: string) => string;
}> = {
  planned: { 
    emoji: '📅', 
    label: 'Planned', 
    colorFn: chalk.blue,
    badge: (s = 'planned') => chalk.blue(`[${s}]`),
  },
  'in-progress': { 
    emoji: '⏳', 
    label: 'In Progress', 
    colorFn: chalk.yellow,
    badge: (s = 'in-progress') => chalk.yellow(`[${s}]`),
  },
  complete: { 
    emoji: '✅', 
    label: 'Complete', 
    colorFn: chalk.green,
    badge: (s = 'complete') => chalk.green(`[${s}]`),
  },
  archived: { 
    emoji: '📦', 
    label: 'Archived', 
    colorFn: chalk.gray,
    badge: (s = 'archived') => chalk.gray(`[${s}]`),
  },
};

/**
 * Priority color and display configuration
 * Colors: critical (red bold), high (red), medium (yellow), low (gray)
 */
export const PRIORITY_CONFIG: Record<SpecPriority, { 
  emoji: string; 
  colorFn: (s: string) => string;
  badge: (s?: string) => string;
}> = {
  critical: { 
    emoji: '🔴', 
    colorFn: chalk.red.bold,
    badge: (s = 'critical') => chalk.red.bold(`[${s}]`),
  },
  high: { 
    emoji: '🟠', 
    colorFn: chalk.hex('#FFA500'),
    badge: (s = 'high') => chalk.hex('#FFA500')(`[${s}]`),
  },
  medium: { 
    emoji: '🟡', 
    colorFn: chalk.yellow,
    badge: (s = 'medium') => chalk.yellow(`[${s}]`),
  },
  low: { 
    emoji: '🟢', 
    colorFn: chalk.gray,
    badge: (s = 'low') => chalk.gray(`[${s}]`),
  },
};

/**
 * Get status badge (e.g., [planned], [in-progress])
 */
export function formatStatusBadge(status: SpecStatus): string {
  return STATUS_CONFIG[status]?.badge() || chalk.white(`[${status}]`);
}

/**
 * Get priority badge (e.g., [critical], [high])
 */
export function formatPriorityBadge(priority: SpecPriority): string {
  return PRIORITY_CONFIG[priority]?.badge() || chalk.white(`[${priority}]`);
}

/**
 * Get status indicator with emoji (for deps command)
 */
export function getStatusIndicator(status: SpecStatus): string {
  const config = STATUS_CONFIG[status];
  if (!config) return chalk.gray('[unknown]');
  return config.colorFn(`[${status}]`);
}

/**
 * Get status emoji
 */
export function getStatusEmoji(status: SpecStatus): string {
  return STATUS_CONFIG[status]?.emoji || '📄';
}

/**
 * Get priority emoji
 */
export function getPriorityEmoji(priority?: SpecPriority): string {
  return priority ? (PRIORITY_CONFIG[priority]?.emoji || '') : '';
}
