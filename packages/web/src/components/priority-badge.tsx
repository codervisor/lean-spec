/**
 * Priority badge component with icons
 */

import { AlertCircle, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

const priorityConfig = {
  'critical': {
    icon: AlertCircle,
    label: 'Critical',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  },
  'high': {
    icon: ArrowUp,
    label: 'High',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
  },
  'medium': {
    icon: Minus,
    label: 'Medium',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  },
  'low': {
    icon: ArrowDown,
    label: 'Low',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
  }
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const Icon = config.icon;

  return (
    <Badge className={cn('flex items-center gap-1.5 w-fit', config.className, className)}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}
