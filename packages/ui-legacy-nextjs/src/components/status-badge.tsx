/**
 * Status badge component with icons
 */

import { Clock, PlayCircle, CheckCircle2, Archive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n/config';

interface StatusBadgeProps {
  status: string;
  className?: string;
  iconOnly?: boolean;
}

const statusConfig = {
  'planned': {
    icon: Clock,
    labelKey: 'status.planned',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  },
  'in-progress': {
    icon: PlayCircle,
    labelKey: 'status.inProgress',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
  },
  'complete': {
    icon: CheckCircle2,
    labelKey: 'status.complete',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  },
  'archived': {
    icon: Archive,
    labelKey: 'status.archived',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
  }
};

export function StatusBadge({ status, className, iconOnly = false }: StatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.planned;
  const Icon = config.icon;
  const { t } = useTranslation('common');
  const label = t(config.labelKey as `status.${string}`);

  return (
    <Badge className={cn('flex items-center w-fit', !iconOnly && 'gap-1.5', config.className, className)}>
      <Icon className="h-3.5 w-3.5" />
      {!iconOnly && label}
    </Badge>
  );
}

export function getStatusLabel(status: string): string {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.planned;
  return i18n.t(config.labelKey as `status.${string}`, { ns: 'common' });
}
