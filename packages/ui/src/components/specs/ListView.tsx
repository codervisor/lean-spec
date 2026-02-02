import { Link } from 'react-router-dom';
import type { Spec, HierarchyNode } from '../../types/api';
import { StatusBadge } from '../StatusBadge';
import { PriorityBadge } from '../PriorityBadge';
import { useTranslation } from 'react-i18next';
import { HierarchyList } from './HierarchyList';
import { TokenBadge } from '../TokenBadge';
import { ValidationBadge } from '../ValidationBadge';
import { memo } from 'react';

interface SpecListItemProps {
  spec: Spec;
  basePath: string;
  onTokenClick: (specName: string) => void;
  onValidationClick: (specName: string) => void;
}

// Memoized spec item to prevent re-renders when dialog state changes
const SpecListItem = memo(function SpecListItem({
  spec,
  basePath,
  onTokenClick,
  onValidationClick,
}: SpecListItemProps) {
  return (
    <Link
      to={`${basePath}/specs/${spec.specName}`}
      className="block p-4 border rounded-lg hover:bg-secondary/50 transition-colors bg-background"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
              #{spec.specNumber}
            </span>
            <h3 className="font-medium truncate">{spec.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground truncate">{spec.specName}</p>
        </div>
        <div className="flex gap-2 items-center flex-shrink-0 flex-wrap justify-end">
          {spec.status && <StatusBadge status={spec.status} />}
          {spec.priority && <PriorityBadge priority={spec.priority} />}
          <TokenBadge
            count={spec.tokenCount}
            size="sm"
            onClick={() => onTokenClick(spec.specName)}
          />
          <ValidationBadge
            status={spec.validationStatus}
            size="sm"
            onClick={() => onValidationClick(spec.specName)}
          />
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
  );
});

type SortOption = 'id-desc' | 'id-asc' | 'updated-desc' | 'title-asc' | 'priority-desc' | 'priority-asc';

interface ListViewProps {
  specs: Spec[];
  /** Pre-built hierarchy from server - if provided, skips client-side tree building */
  hierarchy?: HierarchyNode[];
  basePath?: string;
  groupByParent?: boolean;
  sortBy?: SortOption;
  onTokenClick?: (specName: string) => void;
  onValidationClick?: (specName: string) => void;
}

export function ListView({ specs, hierarchy, basePath = '/projects', groupByParent = false, sortBy = 'id-desc', onTokenClick, onValidationClick }: ListViewProps) {
  const { t } = useTranslation('common');

  if (specs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg bg-secondary/10">
        {t('specsPage.list.empty')}
      </div>
    );
  }

  if (groupByParent) {
    return (
      <HierarchyList
        specs={specs}
        hierarchy={hierarchy}
        basePath={basePath}
        sortBy={sortBy}
        onTokenClick={onTokenClick}
        onValidationClick={onValidationClick}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto space-y-2">
      {specs.map((spec) => (
        <SpecListItem
          key={spec.specName}
          spec={spec}
          basePath={basePath}
          onTokenClick={(name) => onTokenClick?.(name)}
          onValidationClick={(name) => onValidationClick?.(name)}
        />
      ))}
    </div>
  );
}
