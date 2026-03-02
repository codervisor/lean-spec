import { useCallback, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  cn,
  formatRelativeTime,
  HierarchyTree,
  type SortOption,
} from '@/library';
import {
  List,
  type ListImperativeAPI,
} from 'react-window';
import { StatusBadge } from '../status-badge';
import { PriorityBadge } from '../priority-badge';
import { UmbrellaBadge } from '../umbrella-badge';
import { getStatusLabel, getPriorityLabel } from '@/lib/badge-config';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import type { Spec } from '../../types/api';
import { SpecsNavSidebarSkeleton } from '../shared/skeletons';

interface SidebarSpecListProps {
  loading: boolean;
  filteredSpecs: Spec[];
  activeSpecId: string;
  selectedSpecId: string;
  basePath: string;
  viewMode: 'list' | 'tree';
  sortBy: string;
  listHeight: number;
  listRef: React.RefObject<ListImperativeAPI | null>;
  expandedIds: Set<string>;
  onExpandedChange: (ids: Set<string>) => void;
  onSpecClick: (spec: Spec) => void;
  onMobileClose?: () => void;
  t: (key: string) => string;
  language: string;
}

export function SidebarSpecList({
  loading,
  filteredSpecs,
  activeSpecId,
  selectedSpecId,
  basePath,
  viewMode,
  sortBy,
  listHeight,
  listRef,
  expandedIds,
  onExpandedChange,
  onSpecClick,
  onMobileClose,
  t,
  language,
}: SidebarSpecListProps) {
  const RowComponent = useCallback(
    (rowProps: { index: number; style: CSSProperties }) => {
      const { index, style } = rowProps;
      const spec = filteredSpecs[index];
      const isActive = spec?.specName === activeSpecId;
      const displayTitle = spec?.title || spec?.specName;
      if (!spec) return <div style={style} />;

      return (
        <div style={style} className="px-2 py-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to={`${basePath}/specs/${spec.specName}`}
                onClick={() => onMobileClose?.()}
                className={cn(
                  'flex flex-col gap-1 p-1.5 rounded-md text-sm transition-colors h-full justify-center',
                  isActive ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-accent/50'
                )}
              >
                <div className="flex items-center gap-1.5 w-full">
                  {spec.specNumber && (
                    <span className="text-xs font-mono text-muted-foreground shrink-0">#{spec.specNumber}</span>
                  )}
                  <span className="truncate text-xs leading-relaxed flex-1">{displayTitle}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap w-full">
                  {spec.status && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div><StatusBadge status={spec.status} iconOnly className="text-[10px] scale-90" /></div>
                      </TooltipTrigger>
                      <TooltipContent side="right">{getStatusLabel(spec.status, t)}</TooltipContent>
                    </Tooltip>
                  )}
                  {spec.priority && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div><PriorityBadge priority={spec.priority} iconOnly className="text-[10px] scale-90" /></div>
                      </TooltipTrigger>
                      <TooltipContent side="right">{getPriorityLabel(spec.priority, t)}</TooltipContent>
                    </Tooltip>
                  )}
                  {spec.children && spec.children.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div><UmbrellaBadge iconOnly className="h-3 w-3 text-muted-600 dark:text-muted-400" /></div>
                      </TooltipTrigger>
                      <TooltipContent side="right">{t('specs.hierarchy.umbrella')}</TooltipContent>
                    </Tooltip>
                  )}
                  {spec.updatedAt && (
                    <span className="text-[10px] text-muted-foreground">{formatRelativeTime(spec.updatedAt, language)}</span>
                  )}
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[300px]">
              <div className="space-y-1">
                <div className="font-semibold">{displayTitle}</div>
                <div className="text-xs text-muted-foreground">{spec.specName}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      );
    },
    [activeSpecId, basePath, filteredSpecs, language, onMobileClose, t]
  );

  if (loading) return <SpecsNavSidebarSkeleton />;

  if (filteredSpecs.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        {t('specsNavSidebar.noResults')}
      </div>
    );
  }

  if (viewMode === 'tree') {
    return (
      <div className="h-full px-2 py-0.5">
        <HierarchyTree
          specs={filteredSpecs}
          onSpecClick={onSpecClick}
          selectedSpecId={selectedSpecId}
          height={listHeight}
          sortBy={sortBy as SortOption}
          expandedIds={expandedIds}
          onExpandedChange={onExpandedChange}
        />
      </div>
    );
  }

  return (
    <List<Record<string, never>>
      listRef={listRef}
      defaultHeight={listHeight}
      rowCount={filteredSpecs.length}
      rowHeight={60}
      overscanCount={6}
      rowComponent={RowComponent}
      rowProps={{}}
      style={{ height: listHeight, width: '100%' }}
    />
  );
}
