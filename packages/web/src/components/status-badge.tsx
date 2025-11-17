/**
 * Status badge component with icons
 */

'use client';

import { Clock, PlayCircle, CheckCircle2, Archive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/lib/i18n/use-translations';

interface StatusBadgeProps {
  status: string;
  className?: string;
  iconOnly?: boolean;
}

const statusConfigKeys = {
  'planned': 'status.planned',
  'in-progress': 'status.inProgress',
  'complete': 'status.complete',
  'archived': 'status.archived'
};

const statusIcons = {
  'planned': Clock,
  'in-progress': PlayCircle,
  'complete': CheckCircle2,
  'archived': Archive
};

const statusStyles = {
  'planned': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'in-progress': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'complete': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'archived': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
};

export function StatusBadge({ status, className, iconOnly = false }: StatusBadgeProps) {
  const { t } = useTranslations();
  const statusKey = status as keyof typeof statusConfigKeys;
  const Icon = statusIcons[statusKey] || Clock;
  const style = statusStyles[statusKey] || statusStyles.planned;
  const label = t(statusConfigKeys[statusKey] || 'status.planned');

  return (
    <Badge className={cn('flex items-center w-fit', !iconOnly && 'gap-1.5', style, className)}>
      <Icon className="h-3.5 w-3.5" />
      {!iconOnly && label}
    </Badge>
  );
}

export function getStatusLabel(status: string): string {
  // This is a server-side function, so we can't use the hook
  // We'll keep the English labels here for backward compatibility
  const labels: Record<string, string> = {
    'planned': 'Planned',
    'in-progress': 'In Progress',
    'complete': 'Complete',
    'archived': 'Archived'
  };
  return labels[status] || 'Planned';
}
