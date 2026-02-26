import { Badge, cn } from '@/library';
import { useTranslation } from 'react-i18next';
import { sessionStatusConfig } from '@/lib/session-utils';
import type { SessionStatus } from '@/types/api';

interface SessionStatusBadgeProps {
  status: SessionStatus;
  className?: string;
  iconOnly?: boolean;
  responsive?: boolean;
}

export function SessionStatusBadge({ status, className, iconOnly = false, responsive = true }: SessionStatusBadgeProps) {
  const { t } = useTranslation('common');
  const config = sessionStatusConfig[status] || sessionStatusConfig['pending'];

  const Icon = config.icon;
  const label = !iconOnly ? t(config.labelKey) : undefined;

  const isIconOnly = iconOnly || (responsive && false);

  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center w-fit h-5 px-2 py-0.5 text-xs font-medium border-transparent',
        !isIconOnly && 'gap-1.5',
        config.className,
        responsive && !iconOnly && 'hidden sm:flex',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {!isIconOnly && label}
    </Badge>
  );
}
