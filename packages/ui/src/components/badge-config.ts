import { Clock, PlayCircle, CheckCircle2, Archive, AlertCircle, ArrowUp, Minus, ArrowDown } from 'lucide-react';

export const statusConfig: Record<string, { icon: typeof Clock; labelKey: `status.${string}`; className: string }> = {
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

export const priorityConfig: Record<string, { icon: typeof AlertCircle; labelKey: `priority.${string}`; className: string }> = {
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

export function getStatusLabel(status: string, t: (key: string) => string) {
  const config = statusConfig[status] || statusConfig['planned'];
  return t(config.labelKey);
}

export function getPriorityLabel(priority: string, t: (key: string) => string) {
  const config = priorityConfig[priority] || priorityConfig['medium'];
  return t(config.labelKey);
}
