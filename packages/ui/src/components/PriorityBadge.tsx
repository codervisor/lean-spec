import { AlertCircle, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import { Badge } from '@leanspec/ui-components';
import { cn } from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';

interface PriorityBadgeProps {
  priority: string;
  className?: string;
  iconOnly?: boolean;
}

const priorityConfig: Record<string, { icon: typeof AlertCircle; labelKey: `priority.${string}`; className: string }> = {
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
      variant="outline"
      className={cn(
        'flex items-center w-fit h-5 px-2 py-0.5 text-xs font-medium border-transparent',
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
