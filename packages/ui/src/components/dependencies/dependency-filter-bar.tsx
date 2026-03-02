import { cn } from '@/library';
import type { ConnectionStats } from './types';

interface DependencyFilterBarProps {
  statusFilter: string[];
  statusCounts: Record<string, number>;
  showStandalone: boolean;
  isCompact: boolean;
  viewMode: 'graph' | 'focus';
  focusedNodeId: string | null;
  connectionStats: ConnectionStats;
  onToggleStatus: (status: string) => void;
  onToggleStandalone: () => void;
  onToggleCompact: () => void;
  onToggleViewMode: () => void;
  onClear: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function DependencyFilterBar({
  statusFilter,
  statusCounts,
  showStandalone,
  isCompact,
  viewMode,
  focusedNodeId,
  connectionStats,
  onToggleStatus,
  onToggleStandalone,
  onToggleCompact,
  onToggleViewMode,
  onClear,
  t,
}: DependencyFilterBarProps) {
  const hasFilters = statusFilter.length > 0 || focusedNodeId;

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {(['draft', 'planned', 'in-progress', 'complete', 'archived'] as const).map((status) => {
        const isActive = statusFilter.length === 0 || statusFilter.includes(status);
        const label = t(`status.${status}`);
        const count = statusCounts[status] || 0;
        return (
          <button
            key={status}
            onClick={() => onToggleStatus(status)}
            className={cn(
              'rounded border px-2 py-1 font-medium transition-colors',
              isActive && status === 'draft' && 'border-slate-500/60 bg-slate-500/20 text-slate-700 dark:text-slate-200',
              isActive && status === 'planned' && 'border-blue-500/60 bg-blue-500/20 text-blue-700 dark:text-blue-300',
              isActive && status === 'in-progress' && 'border-orange-500/60 bg-orange-500/20 text-orange-700 dark:text-orange-300',
              isActive && status === 'complete' && 'border-green-500/60 bg-green-500/20 text-green-700 dark:text-green-300',
              isActive && status === 'archived' && 'border-gray-500/60 bg-gray-500/20 text-gray-600 dark:text-gray-300',
              !isActive && 'border-border bg-background text-muted-foreground/40'
            )}
          >
            {label}
            <span className="ml-1 opacity-60">{t('dependenciesPage.filters.count', { count })}</span>
          </button>
        );
      })}

      <span className="h-3 w-px bg-border" />

      <button
        onClick={onToggleStandalone}
        className={cn(
          'rounded border px-2 py-1 font-medium transition-colors',
          showStandalone
            ? 'border-violet-500/60 bg-violet-500/20 text-violet-700 dark:text-violet-300'
            : 'border-border bg-background hover:bg-accent text-muted-foreground'
        )}
      >
        {t('dependenciesPage.filters.showStandalone', { count: connectionStats.standalone })}
      </button>

      <span className="h-3 w-px bg-border" />

      <button
        onClick={onToggleCompact}
        className={cn(
          'rounded border px-2 py-1 font-medium transition-colors',
          isCompact
            ? 'border-primary/60 bg-primary/20 text-primary'
            : 'border-border bg-background hover:bg-accent text-muted-foreground'
        )}
      >
        {t('dependenciesPage.filters.compact')}
      </button>

      {focusedNodeId && (
        <button
          onClick={onToggleViewMode}
          className={cn(
            'rounded border px-2 py-1 font-medium transition-colors',
            viewMode === 'focus'
              ? 'border-primary/60 bg-primary/20 text-primary'
              : 'border-border bg-background hover:bg-accent text-muted-foreground'
          )}
        >
          {t('dependenciesPage.filters.focusMode')}
        </button>
      )}

      {hasFilters && (
        <>
          <span className="h-3 w-px bg-border" />
          <button
            onClick={onClear}
            className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 font-medium text-red-400 hover:bg-red-500/20"
          >
            {t('dependenciesPage.filters.clear')}
          </button>
        </>
      )}
    </div>
  );
}
