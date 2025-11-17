/**
 * Priority badge component with icons
 */

'use client';

import { AlertCircle, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/lib/i18n/use-translations';

interface PriorityBadgeProps {
  priority: string;
  className?: string;
  iconOnly?: boolean;
}

const priorityConfigKeys = {
  'critical': 'priority.critical',
  'high': 'priority.high',
  'medium': 'priority.medium',
  'low': 'priority.low'
};

const priorityIcons = {
  'critical': AlertCircle,
  'high': ArrowUp,
  'medium': Minus,
  'low': ArrowDown
};

const priorityStyles = {
  'critical': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'high': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'medium': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'low': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
};

export function PriorityBadge({ priority, className, iconOnly = false }: PriorityBadgeProps) {
  const { t } = useTranslations();
  const priorityKey = priority as keyof typeof priorityConfigKeys;
  const Icon = priorityIcons[priorityKey] || Minus;
  const style = priorityStyles[priorityKey] || priorityStyles.medium;
  const label = t(priorityConfigKeys[priorityKey] || 'priority.medium');

  return (
    <Badge className={cn('flex items-center w-fit', !iconOnly && 'gap-1.5', style, className)}>
      <Icon className="h-3.5 w-3.5" />
      {!iconOnly && label}
    </Badge>
  );
}

export function getPriorityLabel(priority: string): string {
  // This is a server-side function, so we can't use the hook
  // We'll keep the English labels here for backward compatibility
  const labels: Record<string, string> = {
    'critical': 'Critical',
    'high': 'High',
    'medium': 'Medium',
    'low': 'Low'
  };
  return labels[priority] || 'Medium';
}
