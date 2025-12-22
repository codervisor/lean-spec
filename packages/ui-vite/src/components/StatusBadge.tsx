import { Clock, PlayCircle, CheckCircle2, Archive } from 'lucide-react';
import { Badge } from '@leanspec/ui-components';
import { cn } from '../lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
  iconOnly?: boolean;
}

const statusConfig: Record<string, { icon: typeof Clock; label: string; className: string }> = {
  'planned': {
    icon: Clock,
    label: 'Planned',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  'in-progress': {
    icon: PlayCircle,
    label: 'In Progress',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  },
  'complete': {
    icon: CheckCircle2,
    label: 'Complete',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  'archived': {
    icon: Archive,
    label: 'Archived',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
};

export function StatusBadge({ status, className, iconOnly = false }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig['planned'];
  const Icon = config.icon;

  return (
    <Badge className={cn('flex items-center w-fit', !iconOnly && 'gap-1.5', config.className, className)}>
      <Icon className="h-3.5 w-3.5" />
      {!iconOnly && config.label}
    </Badge>
  );
}
