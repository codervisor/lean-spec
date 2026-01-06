import { Link } from 'react-router-dom';
import type { DashboardSpec } from './SpecListItem';
import { formatRelativeTime } from '../../lib/date-utils';
import { useTranslation } from 'react-i18next';

interface ActivityItemProps {
  spec: DashboardSpec;
  action: string;
  time: Date | string | null;
  basePath?: string;
}

export function ActivityItem({ spec, action, time, basePath = '/projects/default' }: ActivityItemProps) {
  const displayTitle = spec.title || spec.specName;
  const specUrl = `${basePath}/specs/${spec.specName}`;
  const { i18n } = useTranslation('common');
  const relativeTime = formatRelativeTime(time, i18n.language);

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <Link to={specUrl} className="font-medium hover:underline" title={spec.specName}>
            {spec.specNumber && `#${spec.specNumber.toString().padStart(3, '0')} `}
            {displayTitle}
          </Link>{' '}
          <span className="text-muted-foreground">{action}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {relativeTime}
        </p>
      </div>
    </div>
  );
}
