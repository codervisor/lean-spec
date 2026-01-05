import { Clock, PlayCircle, CheckCircle2, Archive } from 'lucide-react';
import { Badge } from '@leanspec/ui-components';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface StatusBadgeProps {
  status: string;
  className?: string;
  iconOnly?: boolean;
}

const statusConfig: Record<string, { icon: typeof Clock; labelKey: `status.${string}`; className: string }> = {
  planned: {
    icon: Clock,
    labelKey: 'status.planned',
    className: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-400/40',
  },
  'in-progress': {
    icon: PlayCircle,
    labelKey: 'status.inProgress',
    className: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-orange-400/40',
  },
  complete: {
    icon: CheckCircle2,
    labelKey: 'status.complete',
    className: 'bg-green-500/20 text-green-700 dark:text-green-300 border border-green-200/60 dark:border-green-400/40',
  },
  archived: {
    icon: Archive,
    labelKey: 'status.archived',
    className: 'bg-gray-500/20 text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-gray-500/40',
  },
};

export function getStatusLabel(status: string, t: (key: string) => string) {
  const config = statusConfig[status] || statusConfig['planned'];
  return t(config.labelKey);
}

export function StatusBadge({ status, className, iconOnly = false }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig['planned'];
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
