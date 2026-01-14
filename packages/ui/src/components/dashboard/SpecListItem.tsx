import { Link } from 'react-router-dom';
import { Badge } from '@leanspec/ui-components';
import { StatusBadge } from '../StatusBadge';
import { PriorityBadge } from '../PriorityBadge';
import type { Spec } from '../../types/api';

export type DashboardSpec = Spec;

interface SpecListItemProps {
  spec: DashboardSpec;
  basePath?: string;
}

export function SpecListItem({ spec, basePath = '/projects/default' }: SpecListItemProps) {
  const displayTitle = spec.title || spec.specName;
  const specUrl = `${basePath}/specs/${spec.specName}`;

  return (
    <Link
      to={specUrl}
      className="block p-3 rounded-lg hover:bg-accent transition-colors"
      title={spec.specName}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {spec.specNumber && (
              <span className="text-sm font-mono text-muted-foreground shrink-0">
                #{spec.specNumber}
              </span>
            )}
            <h4 className="text-sm font-medium truncate">
              {displayTitle}
            </h4>
          </div>
          {displayTitle !== spec.specName && (
            <div className="text-xs text-muted-foreground mb-1">
              {spec.specName}
            </div>
          )}
          {spec.tags && spec.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {spec.tags.slice(0, 3).map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {spec.status && <StatusBadge status={spec.status} className="text-[11px]" />}
          {spec.priority && <PriorityBadge priority={spec.priority} className="text-[11px]" />}
        </div>
      </div>
    </Link>
  );
}
