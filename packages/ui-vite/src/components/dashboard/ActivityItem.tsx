import { Link } from 'react-router-dom';
import type { DashboardSpec } from './SpecListItem';

interface ActivityItemProps {
  spec: DashboardSpec;
  action: string;
  time: Date | null;
  basePath?: string;
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Unknown';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

export function ActivityItem({ spec, action, time, basePath = '/projects/default' }: ActivityItemProps) {
  const displayTitle = spec.title || spec.name;
  const specUrl = `${basePath}/specs/${spec.name}`;

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <Link to={specUrl} className="font-medium hover:underline" title={spec.name}>
            {spec.specNumber && `#${spec.specNumber.toString().padStart(3, '0')} `}
            {displayTitle}
          </Link>{' '}
          <span className="text-muted-foreground">{action}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatRelativeTime(time)}
        </p>
      </div>
    </div>
  );
}
