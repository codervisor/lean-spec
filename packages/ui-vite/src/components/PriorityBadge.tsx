import { AlertCircle, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import { Badge } from '@leanspec/ui-components';
import { cn } from '../lib/utils';

interface PriorityBadgeProps {
  priority: string;
  className?: string;
  iconOnly?: boolean;
}

const priorityConfig: Record<string, { icon: typeof AlertCircle; label: string; className: string }> = {
  'critical': {
    icon: AlertCircle,
    label: 'Critical',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  'high': {
    icon: ArrowUp,
    label: 'High',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  },
  'medium': {
    icon: Minus,
    label: 'Medium',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  'low': {
    icon: ArrowDown,
    label: 'Low',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
};

export function PriorityBadge({ priority, className, iconOnly = false }: PriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig['medium'];
  const Icon = config.icon;

  return (
    <Badge className={cn('flex items-center w-fit', !iconOnly && 'gap-1.5', config.className, className)}>
      <Icon className="h-3.5 w-3.5" />
      {!iconOnly && config.label}
    </Badge>
  );
}
