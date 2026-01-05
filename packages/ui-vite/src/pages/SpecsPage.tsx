import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LayoutGrid, List, AlertCircle, FileQuestion, FilterX, RefreshCcw } from 'lucide-react';
import { Button, Card, CardContent } from '@leanspec/ui-components';
import { useParams, useSearchParams } from 'react-router-dom';
import { api, type Spec } from '../lib/api';
import { BoardView } from '../components/specs/BoardView';
import { ListView } from '../components/specs/ListView';
import { SpecsFilters } from '../components/specs/SpecsFilters';
import { cn } from '../lib/utils';
import { SpecListSkeleton } from '../components/shared/Skeletons';
import { EmptyState } from '../components/shared/EmptyState';
import { useProject } from '../contexts';
import { useTranslation } from 'react-i18next';

type ViewMode = 'list' | 'board';
type SpecStatus = 'planned' | 'in-progress' | 'complete' | 'archived';
type SortOption = 'id-desc' | 'id-asc' | 'updated-desc' | 'title-asc';

export function SpecsPage() {
  const [specs, setSpecs] = useState<Spec[]>([]);
  const { projectId } = useParams<{ projectId: string }>();
  const basePath = projectId ? `/projects/${projectId}` : '/projects/default';
  const { currentProject, loading: projectLoading } = useProject();
  const projectReady = !projectId || currentProject?.id === projectId;
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('id-desc');

  const [searchParams] = useSearchParams();
  const initializedFromQuery = useRef(false);

  // View State
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('specs-view-mode');
    return (saved === 'board' || saved === 'list') ? saved : 'list';
  });

  const loadSpecs = useCallback(async () => {
    if (!projectReady || projectLoading) return;
    try {
      setLoading(true);
      const data = await api.getSpecs();
      setSpecs(data);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load specs');
    } finally {
      setLoading(false);
    }
  }, [projectLoading, projectReady]);

  useEffect(() => {
    void loadSpecs();
  }, [loadSpecs]);

  useEffect(() => {
    if (initializedFromQuery.current) return;
    const initialTag = searchParams.get('tag');
    const initialQuery = searchParams.get('q');
    if (initialTag) setTagFilter(initialTag);
    if (initialQuery) setSearchQuery(initialQuery);
    initializedFromQuery.current = true;
  }, [searchParams]);

  useEffect(() => {
    localStorage.setItem('specs-view-mode', viewMode);
  }, [viewMode]);

  const handleStatusChange = useCallback(async (spec: Spec, newStatus: SpecStatus) => {
    // Optimistic update
    setSpecs(prev => prev.map(s =>
      s.name === spec.name ? { ...s, status: newStatus } : s
    ));

    try {
      await api.updateSpec(spec.name, { status: newStatus });
    } catch (err) {
      // Revert on error
      setSpecs(prev => prev.map(s =>
        s.name === spec.name ? { ...s, status: spec.status } : s
      ));
      console.error('Failed to update status:', err);
    }
  }, []);

  // Get unique values for filters
  const uniqueStatuses = useMemo(() => {
    const statuses = specs.map((s) => s.status).filter((s): s is SpecStatus => Boolean(s));
    return Array.from(new Set(statuses));
  }, [specs]);
  const uniquePriorities = useMemo(() =>
    Array.from(new Set(specs.map(s => s.priority).filter(Boolean) as string[])),
    [specs]
  );
  const uniqueTags = useMemo(() =>
    Array.from(new Set(specs.flatMap(s => s.tags || []))),
    [specs]
  );

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setTagFilter('all');
  }, []);

  // Filter specs based on search and filters
  const filteredSpecs = useMemo(() => {
    const filtered = specs.filter(spec => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          spec.name.toLowerCase().includes(query) ||
          (spec.title ? spec.title.toLowerCase().includes(query) : false) ||
          spec.tags?.some((tag: string) => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      if (statusFilter !== 'all' && spec.status !== statusFilter) {
        return false;
      }

      if (priorityFilter !== 'all' && spec.priority !== priorityFilter) {
        return false;
      }

      if (tagFilter !== 'all' && !spec.tags?.includes(tagFilter)) {
        return false;
      }

      return true;
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case 'id-asc':
        sorted.sort((a, b) => (a.specNumber || 0) - (b.specNumber || 0));
        break;
      case 'updated-desc':
        sorted.sort((a, b) => {
          if (!a.updatedAt) return 1;
          if (!b.updatedAt) return -1;
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        });
        break;
      case 'title-asc':
        sorted.sort((a, b) => {
          const titleA = (a.title || a.name).toLowerCase();
          const titleB = (b.title || b.name).toLowerCase();
          return titleA.localeCompare(titleB);
        });
        break;
      case 'id-desc':
      default:
        sorted.sort((a, b) => (b.specNumber || 0) - (a.specNumber || 0));
        break;
    }

    return sorted;
  }, [priorityFilter, searchQuery, sortBy, specs, statusFilter, tagFilter]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <SpecListSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="flex justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="text-lg font-semibold">{t('specsPage.state.errorTitle')}</div>
            <p className="text-sm text-muted-foreground">{error || t('specsPage.state.errorDescription')}</p>
            <Button variant="secondary" size="sm" onClick={loadSpecs} className="mt-2">
              {t('actions.retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col gap-4 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col gap-4 sticky top-14 bg-background mt-0 py-2 z-10">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">{t('specsPage.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('specsPage.count', { count: filteredSpecs.length })}</p>
          </div>

          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={cn(
                "h-8",
                viewMode === 'list' && "bg-background shadow-sm"
              )}
              title={t('specsPage.views.listTooltip')}
            >
              <List className="w-4 h-4 mr-1.5" />
              {t('specsPage.views.list')}
            </Button>
            <Button
              variant={viewMode === 'board' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('board')}
              className={cn(
                "h-8",
                viewMode === 'board' && "bg-background shadow-sm"
              )}
              title={t('specsPage.views.boardTooltip')}
            >
              <LayoutGrid className="w-4 h-4 mr-1.5" />
              {t('specsPage.views.board')}
            </Button>
          </div>
        </div>

        <SpecsFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          tagFilter={tagFilter}
          onTagFilterChange={setTagFilter}
          sortBy={sortBy}
          onSortByChange={(value) => setSortBy(value as SortOption)}
          uniqueStatuses={uniqueStatuses}
          uniquePriorities={uniquePriorities}
          uniqueTags={uniqueTags}
          onClearFilters={handleClearFilters}
          totalSpecs={specs.length}
          filteredCount={filteredSpecs.length}
        />
      </div>

      <div className="flex-1 min-h-0">
        {specs.length === 0 ? (
          <EmptyState
            icon={FileQuestion}
            title={t('specsPage.state.noSpecsTitle')}
            description={t('specsPage.state.noSpecsDescription')}
            actions={(
              <Button variant="secondary" size="sm" onClick={loadSpecs}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                {t('specsPage.buttons.refreshList')}
              </Button>
            )}
          />
        ) : filteredSpecs.length === 0 ? (
          <EmptyState
            icon={FilterX}
            title={t('specsPage.state.noFiltersTitle')}
            description={t('specsPage.state.noFiltersDescription')}
            actions={(
              <div className="flex gap-2 flex-wrap justify-center">
                <Button variant="outline" size="sm" onClick={handleClearFilters}>
                  {t('specsNavSidebar.clearFilters')}
                </Button>
                <Button variant="secondary" size="sm" onClick={loadSpecs}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  {t('specsPage.buttons.reloadData')}
                </Button>
              </div>
            )}
          />
        ) : viewMode === 'list' ? (
          <ListView specs={filteredSpecs} basePath={basePath} />
        ) : (
          <BoardView
            specs={filteredSpecs}
            onStatusChange={handleStatusChange}
            basePath={basePath}
          />
        )}
      </div>
    </div>
  );
}
