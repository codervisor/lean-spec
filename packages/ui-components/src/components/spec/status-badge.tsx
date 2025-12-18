/**
 * Status badge component with icons
 * Framework-agnostic - no i18n dependency, labels passed as props or using defaults
 */

import { Clock, PlayCircle, CheckCircle2, Archive, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SpecStatus } from '@/types/specs';

export interface StatusConfig {
  icon: LucideIcon;
  label: string;
  className: string;
}

/**
 * Default status configuration
 */
export const defaultStatusConfig: Record<SpecStatus, StatusConfig> = {
  planned: {
    icon: Clock,
    label: 'Planned',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  'in-progress': {
    icon: PlayCircle,
    label: 'In Progress',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  complete: {
    icon: CheckCircle2,
    label: 'Complete',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  archived: {
    icon: Archive,
    label: 'Archived',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  },
};

export interface StatusBadgeProps {
  /** The status to display */
  status: string;
  /** Additional CSS classes */
  className?: string;
  /** Show only icon, no label */
  iconOnly?: boolean;
  /** Custom label override */
  label?: string;
  /** Custom status configuration */
  statusConfig?: Record<string, StatusConfig>;
}

export function StatusBadge({
  status,
  className,
  iconOnly = false,
  label,
  statusConfig = defaultStatusConfig,
}: StatusBadgeProps) {
  const config = statusConfig[status as SpecStatus] || defaultStatusConfig.planned;
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
 * Get the default label for a status
 */
export function getStatusLabel(
  status: string,
  statusConfig: Record<string, StatusConfig> = defaultStatusConfig
): string {
  const config = statusConfig[status as SpecStatus] || defaultStatusConfig.planned;
  return config.label;
}
