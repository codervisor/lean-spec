/**
 * Shared badge configuration for priority and status
 * Central source of truth for badge styling and labels
 */

import { Clock, PlayCircle, CheckCircle2, Archive, AlertCircle, ArrowUp, Minus, ArrowDown, CircleDotDashed, type LucideIcon } from 'lucide-react';
import type { SpecPriority, SpecStatus } from '../types/specs';

export interface BadgeConfig {
  icon: LucideIcon;
  label: string;
  labelKey: string;
  className: string;
}

/**
 * Status badge configuration
 * Used by both display badges and editors
 */
export const statusConfig: Record<SpecStatus, BadgeConfig> = {
  'draft': {
    icon: CircleDotDashed,
    label: 'Draft',
    labelKey: 'status.draft',
    className: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300'
  },
  'planned': {
    icon: Clock,
    label: 'Planned',
    labelKey: 'status.planned',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  },
  'in-progress': {
    icon: PlayCircle,
    label: 'In Progress',
    labelKey: 'status.inProgress',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
  },
  'complete': {
    icon: CheckCircle2,
    label: 'Complete',
    labelKey: 'status.complete',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  },
  'archived': {
    icon: Archive,
    label: 'Archived',
    labelKey: 'status.archived',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
  }
};

/**
 * Priority badge configuration
 * Used by both display badges and editors
 */
export const priorityConfig: Record<SpecPriority, BadgeConfig> = {
  'critical': {
    icon: AlertCircle,
    label: 'Critical',
    labelKey: 'priority.critical',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  },
  'high': {
    icon: ArrowUp,
    label: 'High',
    labelKey: 'priority.high',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
  },
  'medium': {
    icon: Minus,
    label: 'Medium',
    labelKey: 'priority.medium',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  },
  'low': {
    icon: ArrowDown,
    label: 'Low',
    labelKey: 'priority.low',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
  }
};

export function getStatusLabel(status: string, t?: (key: string) => string): string {
  const config = statusConfig[status as SpecStatus] || statusConfig['planned'];
  return t ? t(config.labelKey) : config.label;
}

export function getPriorityLabel(priority: string, t?: (key: string) => string): string {
  const config = priorityConfig[priority as SpecPriority] || priorityConfig['medium'];
  return t ? t(config.labelKey) : config.label;
}
