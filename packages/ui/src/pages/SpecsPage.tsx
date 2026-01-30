import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LayoutGrid, List, AlertCircle, FileQuestion, FilterX, RefreshCcw, Umbrella } from 'lucide-react';
import { Button, Card, CardContent } from '@leanspec/ui-components';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Spec } from '../types/api';
import { BoardView } from '../components/specs/BoardView';
import { ListView } from '../components/specs/ListView';
import { SpecsFilters } from '../components/specs/SpecsFilters';
import { cn } from '../lib/utils';
import { SpecListSkeleton } from '../components/shared/Skeletons';
import { PageHeader } from '../components/shared/PageHeader';
import { EmptyState } from '../components/shared/EmptyState';
import { useProject, useLayout, useMachine } from '../contexts';
import { useTranslation } from 'react-i18next';

type ViewMode = 'list' | 'board';
type SpecStatus = 'planned' | 'in-progress' | 'complete' | 'archived';
type SortOption = 'id-desc' | 'id-asc' | 'updated-desc' | 'title-asc';

export function SpecsPage() {
  const [specs, setSpecs] = useState<Spec[]>([]);
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, loading: projectLoading } = useProject();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';
  const { isWideMode } = useLayout();
  const { machineModeEnabled, isMachineAvailable } = useMachine();
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
  const [groupByParent, setGroupByParent] = useState(false);

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
    } catch (err: unknown) {
      console.error('Failed to load specs', err);
      setError(t('specsPage.state.errorDescription'));
    } finally {
      setLoading(false);
    }
  }, [projectLoading, projectReady, t]);

  useEffect(() => {
    void loadSpecs();
  }, [loadSpecs]);

  useEffect(() => {
    if (initializedFromQuery.current) return;
    const initialTag = searchParams.get('tag');
    const initialQuery = searchParams.get('q');
    const initialView = searchParams.get('view');
    const initialGroupByParent = searchParams.get('groupByParent');
    if (initialTag) setTagFilter(initialTag);
    if (initialQuery) setSearchQuery(initialQuery);
    if (initialView === 'board' || initialView === 'list') {
      setViewMode(initialView);
    }
    if (initialGroupByParent === '1' || initialGroupByParent === 'true') {
      setGroupByParent(true);
    }
    initializedFromQuery.current = true;
  }, [searchParams]);

  useEffect(() => {
    localStorage.setItem('specs-view-mode', viewMode);
  }, [viewMode]);

  const handleStatusChange = useCallback(async (spec: Spec, newStatus: SpecStatus) => {
    if (machineModeEnabled && !isMachineAvailable) {
      return;
    }
    // Optimistic update
    setSpecs(prev => prev.map(s =>
      s.specName === spec.specName ? { ...s, status: newStatus } : s
    ));

    try {
      await api.updateSpec(spec.specName, { status: newStatus, expectedContentHash: spec.contentHash });
    } catch (err) {
      // Revert on error
      setSpecs(prev => prev.map(s =>
        s.specName === spec.specName ? { ...s, status: spec.status } : s
      ));
      console.error('Failed to update status:', err);
    }
  }, [isMachineAvailable, machineModeEnabled]);

  // Get unique values for filters
  const uniqueStatuses = useMemo(() => {
    const statuses = specs.map((s) => s.status).filter((s): s is SpecStatus => Boolean(s));
    const uniqueSet = Array.from(new Set(statuses));
    // Sort by defined order: planned -> in-progress -> complete -> archived
    const statusOrder: Record<SpecStatus, number> = {
      'planned': 1,
      'in-progress': 2,
      'complete': 3,
      'archived': 4,
    };
    return uniqueSet.sort((a, b) => statusOrder[a] - statusOrder[b]);
  }, [specs]);
  const uniquePriorities = useMemo(() => {
    const uniqueSet = Array.from(new Set(specs.map(s => s.priority).filter(Boolean) as string[]));
    // Sort by defined order: critical -> high -> medium -> low
    const priorityOrder: Record<string, number> = {
      'critical': 1,
      'high': 2,
      'medium': 3,
      'low': 4,
    };
    return uniqueSet.sort((a, b) => (priorityOrder[a] || 999) - (priorityOrder[b] || 999));
  }, [specs]);
  const uniqueTags = useMemo(() => {
    const uniqueSet = Array.from(new Set(specs.flatMap(s => s.tags || [])));
    // Sort alphabetically ascending
    return uniqueSet.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [specs]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setTagFilter('all');
  }, []);

  // Helper: expand filtered specs to include all descendants (for groupByParent mode)
  // This ensures umbrella progress visibility even when children have different statuses
  const expandWithDescendants = useCallback((filtered: Spec[], allSpecs: Spec[]): Spec[] => {
    // Build children map
    const childrenMap = new Map<string, Spec[]>();
    for (const spec of allSpecs) {
      const parentId = spec.parent;
      if (parentId) {
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(spec);
      }
    }

    // Collect all matching spec IDs
    const resultIds = new Set(filtered.map(s => s.specName || s.id));

    // Recursively add descendants
    const addDescendants = (specId: string) => {
      const children = childrenMap.get(specId);
      if (children) {
        for (const child of children) {
          const childId = child.specName || child.id;
          if (childId && !resultIds.has(childId)) {
            resultIds.add(childId);
            addDescendants(childId);
          }
        }
      }
    };

    for (const spec of filtered) {
      addDescendants(spec.specName || spec.id || '');
    }

    // Return specs that are in the result set
    return allSpecs.filter(s => resultIds.has(s.specName || s.id || ''));
  }, []);

  // Filter specs based on search and filters
  const filteredSpecs = useMemo(() => {
    let filtered = specs.filter(spec => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          spec.specName.toLowerCase().includes(query) ||
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

    // For groupByParent mode, expand to include all descendants of matching specs
    // This ensures umbrella specs show their full hierarchy for progress visibility
    if (groupByParent && (statusFilter !== 'all' || priorityFilter !== 'all')) {
      filtered = expandWithDescendants(filtered, specs);
    }

    const sorted = [...filtered];
    switch (sortBy) {
      case 'id-asc':
        sorted.sort((a, b) => (a.specNumber || 0) - (b.specNumber || 0));
        break;
      case 'updated-desc':
        sorted.sort((a, b) => {
          if (!a.updatedAt) return 1;
          if (!b.updatedAt) return -1;
          const aTime = new Date(a.updatedAt).getTime();
          const bTime = new Date(b.updatedAt).getTime();
          return bTime - aTime;
        });
        break;
      case 'title-asc':
        sorted.sort((a, b) => {
          const titleA = (a.title || a.specName).toLowerCase();
          const titleB = (b.title || b.specName).toLowerCase();
          return titleA.localeCompare(titleB);
        });
        break;
      case 'id-desc':
      default:
        sorted.sort((a, b) => (b.specNumber || 0) - (a.specNumber || 0));
        break;
    }

    return sorted;
  }, [priorityFilter, searchQuery, sortBy, specs, statusFilter, tagFilter, groupByParent, expandWithDescendants]);

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
    <div className={cn("h-[calc(100vh-3.5rem)] flex flex-col gap-4 p-4 sm:p-6 mx-auto w-full", isWideMode ? "max-w-full" : "max-w-7xl")}>
      <div className="flex flex-col gap-4 sticky top-14 bg-background mt-0 py-2 z-10">
        <PageHeader
          title={t('specsPage.title')}
          description={t('specsPage.description')}
          actions={(
            <div className="flex items-center gap-3">
              {viewMode === 'board' && (
                <Button
                  variant={groupByParent ? "secondary" : "outline"}
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setGroupByParent(!groupByParent)}
                  title="Group specs by umbrella/parent"
                >
                  <Umbrella className={cn("w-3.5 h-3.5", groupByParent ? "text-primary" : "text-muted-foreground")} />
                  <span className="hidden sm:inline">Group by Parent</span>
                </Button>
              )}
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
          )}
        />

        {machineModeEnabled && !isMachineAvailable && (
          <div className="text-xs text-destructive">
            {t('machines.unavailable')}
          </div>
        )}


        <p className="text-sm text-muted-foreground">{t('specsPage.count', { count: filteredSpecs.length })}</p>

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
            canEdit={!machineModeEnabled || isMachineAvailable}
            basePath={basePath}
            groupByParent={groupByParent}
          />
        )}
      </div>
    </div>
  );
}
