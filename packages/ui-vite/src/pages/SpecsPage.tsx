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

type ViewMode = 'list' | 'board';
type SpecStatus = 'planned' | 'in-progress' | 'complete' | 'archived';

export function SpecsPage() {
  const [specs, setSpecs] = useState<Spec[]>([]);
  const { projectId } = useParams<{ projectId: string }>();
  const basePath = projectId ? `/projects/${projectId}` : '/projects/default';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const [searchParams] = useSearchParams();
  const initializedFromQuery = useRef(false);

  // View State
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('specs-view-mode');
    return (saved === 'board' || saved === 'list') ? saved : 'list';
  });
  const [showArchivedBoard, setShowArchivedBoard] = useState(false);

  const loadSpecs = useCallback(async () => {
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
  }, []);

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

  // Auto-show archived column when filtering by archived status in board view
  useEffect(() => {
    if (statusFilter === 'archived' && viewMode === 'board') {
      setShowArchivedBoard(true);
    }
  }, [statusFilter, viewMode]);

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
    return specs.filter(spec => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          spec.name.toLowerCase().includes(query) ||
          (spec.title ? spec.title.toLowerCase().includes(query) : false) ||
          spec.tags?.some((tag: string) => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && spec.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && spec.priority !== priorityFilter) {
        return false;
      }

      // Tag filter
      if (tagFilter !== 'all' && !spec.tags?.includes(tagFilter)) {
        return false;
      }

      return true;
    });
  }, [specs, searchQuery, statusFilter, priorityFilter, tagFilter]);

  if (loading) {
    return <SpecListSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <div className="flex justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="text-lg font-semibold">Unable to load specs</div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="secondary" size="sm" onClick={loadSpecs} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Specs</h2>

        <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-lg border">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === 'list'
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === 'board'
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Board View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
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
        uniqueStatuses={uniqueStatuses}
        uniquePriorities={uniquePriorities}
        uniqueTags={uniqueTags}
        onClearFilters={handleClearFilters}
        totalSpecs={specs.length}
        filteredCount={filteredSpecs.length}
      />

      <div className="flex-1 min-h-0">
        {specs.length === 0 ? (
          <EmptyState
            icon={FileQuestion}
            title="No specs yet"
            description="We could not find any specs for this project. Add a spec in your LeanSpec workspace, then refresh to see it here."
            actions={(
              <Button variant="secondary" size="sm" onClick={loadSpecs}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh list
              </Button>
            )}
          />
        ) : filteredSpecs.length === 0 ? (
          <EmptyState
            icon={FilterX}
            title="No specs match your filters"
            description="Try clearing filters or adjusting your search to see more specs."
            actions={(
              <div className="flex gap-2 flex-wrap justify-center">
                <Button variant="outline" size="sm" onClick={handleClearFilters}>
                  Clear filters
                </Button>
                <Button variant="secondary" size="sm" onClick={loadSpecs}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Reload data
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
            showArchived={showArchivedBoard}
            onToggleArchived={() => setShowArchivedBoard(!showArchivedBoard)}
            basePath={basePath}
          />
        )}
      </div>
    </div>
  );
}
