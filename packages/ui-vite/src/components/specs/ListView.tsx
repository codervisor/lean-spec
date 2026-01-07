import { Link } from 'react-router-dom';
import type { Spec } from '../../types/api';
import { StatusBadge } from '../StatusBadge';
import { PriorityBadge } from '../PriorityBadge';
import { useTranslation } from 'react-i18next';

interface ListViewProps {
  specs: Spec[];
  basePath?: string;
}

export function ListView({ specs, basePath = '/projects/default' }: ListViewProps) {
  const { t } = useTranslation('common');

  if (specs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg bg-secondary/10">
        {t('specsPage.list.empty')}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto space-y-2">
      {specs.map((spec) => (
        <Link
          key={spec.specName}
          to={`${basePath}/specs/${spec.specName}`}
          className="block p-4 border rounded-lg hover:bg-secondary/50 transition-colors bg-background"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                  {spec.specName.split('-')[0]}
                </span>
                <h3 className="font-medium truncate">{spec.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground truncate">{spec.specName}</p>
            </div>
            <div className="flex gap-2 items-center flex-shrink-0">
              {spec.status && <StatusBadge status={spec.status} />}
              {spec.priority && <PriorityBadge priority={spec.priority} />}
            </div>
          </div>
          {spec.tags && spec.tags.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {spec.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-secondary rounded text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
