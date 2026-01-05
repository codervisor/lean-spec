import { AlertCircle, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import { Badge } from '@leanspec/ui-components';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface PriorityBadgeProps {
  priority: string;
  className?: string;
  iconOnly?: boolean;
}

const priorityConfig: Record<string, { icon: typeof AlertCircle; labelKey: `priority.${string}`; className: string }> = {
  critical: {
    icon: AlertCircle,
    labelKey: 'priority.critical',
    className: 'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-400/40',
  },
  high: {
    icon: ArrowUp,
    labelKey: 'priority.high',
    className: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-orange-400/40',
  },
  medium: {
    icon: Minus,
    labelKey: 'priority.medium',
    className: 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-200/60 dark:border-blue-400/40',
  },
  low: {
    icon: ArrowDown,
    labelKey: 'priority.low',
    className: 'bg-gray-500/20 text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-gray-500/40',
  },
};

export function getPriorityLabel(priority: string, t: (key: string) => string) {
  const config = priorityConfig[priority] || priorityConfig['medium'];
  return t(config.labelKey);
}

export function PriorityBadge({ priority, className, iconOnly = false }: PriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig['medium'];
  const Icon = config.icon;
  const { t } = useTranslation('common');

  return (
    <Badge
      className={cn(
        'flex items-center w-fit h-5 px-2 py-0.5 text-xs font-medium',
        !iconOnly && 'gap-1.5',
        config.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {!iconOnly && t(config.labelKey)}
    </Badge>
  );
}
