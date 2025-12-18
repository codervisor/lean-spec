/**
 * Priority badge component with icons
 * Framework-agnostic - no i18n dependency, labels passed as props or using defaults
 */

import { AlertCircle, ArrowUp, Minus, ArrowDown, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SpecPriority } from '@/types/specs';

export interface PriorityConfig {
  icon: LucideIcon;
  label: string;
  className: string;
}

/**
 * Default priority configuration
 */
export const defaultPriorityConfig: Record<SpecPriority, PriorityConfig> = {
  critical: {
    icon: AlertCircle,
    label: 'Critical',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  high: {
    icon: ArrowUp,
    label: 'High',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  medium: {
    icon: Minus,
    label: 'Medium',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  low: {
    icon: ArrowDown,
    label: 'Low',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  },
};

export interface PriorityBadgeProps {
  /** The priority to display */
  priority: string;
  /** Additional CSS classes */
  className?: string;
  /** Show only icon, no label */
  iconOnly?: boolean;
  /** Custom label override */
  label?: string;
  /** Custom priority configuration */
  priorityConfig?: Record<string, PriorityConfig>;
}

export function PriorityBadge({
  priority,
  className,
  iconOnly = false,
  label,
  priorityConfig = defaultPriorityConfig,
}: PriorityBadgeProps) {
  const config = priorityConfig[priority as SpecPriority] || defaultPriorityConfig.medium;
  const Icon = config.icon;
  const displayLabel = label ?? config.label;

  return (
    <Badge
      className={cn('flex items-center w-fit', !iconOnly && 'gap-1.5', config.className, className)}
    >
      <Icon className="h-3.5 w-3.5" />
      {!iconOnly && displayLabel}
    </Badge>
  );
}

/**
 * Get the default label for a priority
 */
export function getPriorityLabel(
  priority: string,
  priorityConfig: Record<string, PriorityConfig> = defaultPriorityConfig
): string {
  const config = priorityConfig[priority as SpecPriority] || defaultPriorityConfig.medium;
  return config.label;
}
