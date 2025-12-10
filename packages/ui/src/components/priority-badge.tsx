/**
 * Priority badge component with icons
 */

import { AlertCircle, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n/config';

interface PriorityBadgeProps {
  priority: string;
  className?: string;
  iconOnly?: boolean;
}

const priorityConfig = {
  'critical': {
    icon: AlertCircle,
    labelKey: 'priority.critical',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  },
  'high': {
    icon: ArrowUp,
    labelKey: 'priority.high',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
  },
  'medium': {
    icon: Minus,
    labelKey: 'priority.medium',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  },
  'low': {
    icon: ArrowDown,
    labelKey: 'priority.low',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
  }
};

export function PriorityBadge({ priority, className, iconOnly = false }: PriorityBadgeProps) {
  const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const Icon = config.icon;
  const { t } = useTranslation('common');
  const label = t(config.labelKey as `priority.${string}`);

  return (
    <Badge className={cn('flex items-center w-fit', !iconOnly && 'gap-1.5', config.className, className)}>
      <Icon className="h-3.5 w-3.5" />
      {!iconOnly && label}
    </Badge>
  );
}

export function getPriorityLabel(priority: string): string {
  const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
  return i18n.t(config.labelKey as `priority.${string}`, { ns: 'common' });
}
