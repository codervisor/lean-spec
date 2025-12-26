import { Clock, PlayCircle, CheckCircle2, Archive } from 'lucide-react';
import { Badge } from '@leanspec/ui-components';
import { cn } from '../lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
  iconOnly?: boolean;
}

const statusConfig: Record<string, { icon: typeof Clock; label: string; className: string }> = {
  planned: {
    icon: Clock,
    label: 'Planned',
    className: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-400/40',
  },
  'in-progress': {
    icon: PlayCircle,
    label: 'In Progress',
    className: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-orange-400/40',
  },
  complete: {
    icon: CheckCircle2,
    label: 'Complete',
    className: 'bg-green-500/20 text-green-700 dark:text-green-300 border border-green-200/60 dark:border-green-400/40',
  },
  archived: {
    icon: Archive,
    label: 'Archived',
    className: 'bg-gray-500/20 text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-gray-500/40',
  },
};

export function StatusBadge({ status, className, iconOnly = false }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig['planned'];
  const Icon = config.icon;

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
      {!iconOnly && config.label}
    </Badge>
  );
}
