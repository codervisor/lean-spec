import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, FileQuestion, FilterX, RefreshCcw } from 'lucide-react';
import { Button, Card, CardContent, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/library';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Spec, SpecStatus, ValidationStatus } from '../types/api';
import { BoardView } from '../components/specs/board-view';
import { ListView } from '../components/specs/list-view';
import { SpecsFilters } from '../components/specs/specs-filters';
import { TokenDetailsDialog } from '../components/specs/token-details-dialog';
import { ValidationDialog } from '../components/specs/validation-dialog';
import { SpecListSkeleton } from '../components/shared/skeletons';
import { PageHeader } from '../components/shared/page-header';
import { EmptyState } from '../components/shared/empty-state';
import { PageContainer } from '../components/shared/page-container';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { specKeys, useSpecsWithHierarchy, useSearchSpecs, useBatchMetadata } from '../hooks/useSpecsQuery';
import { useMachineStore } from '../stores/machine';
import { useSpecsPreferencesStore, type SpecsSortOption } from '../stores/specs-preferences';
import { useSpecActionDialogs } from '../hooks/useSpecActionDialogs';
import { useTranslation } from 'react-i18next';

type ViewMode = 'list' | 'board';
const INLINE_EDIT_MAX_ITEMS = 120;

export function SpecsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject } = useCurrentProject();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';
  const { machineModeEnabled, isMachineAvailable } = useMachineStore();
  const specsQuery = useSpecsWithHierarchy(resolvedProjectId ?? null, { hierarchy: true });
  const specs = useMemo(() => specsQuery.data?.specs ?? [], [specsQuery.data]);
  const queryClient = useQueryClient();

  const updateSpecsCache = useCallback(
    (updater: (items: Spec[]) => Spec[]) => {
      queryClient.setQueriesData({ queryKey: specKeys.lists() }, (old) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return updater(old as Spec[]);
        }
        if (typeof old === 'object' && old && 'specs' in old) {
          const data = old as { specs: Spec[];[key: string]: unknown };
          return { ...data, specs: updater(data.specs ?? []) };
        }
        return old;
      });
    },
    [queryClient]
  );
  // Pre-built hierarchy from server - used when groupByParent is true for performance
  const hierarchy = useMemo(() => specsQuery.data?.hierarchy, [specsQuery.data]);
  const { t } = useTranslation('common');
  const isInitialLoading = specsQuery.isLoading && !specsQuery.data;
  const error = specsQuery.error ? t('specsPage.state.errorDescription') : null;

  const {
    activeSpecName,
    tokenDialogOpen,
    tokenDialogLoading,
    tokenDialogData,
    closeTokenDialog,
    handleTokenClick,
    validationDialogOpen,
    validationDialogLoading,
    validationDialogData,
    closeValidationDialog,
    handleValidationClick,
  } = useSpecActionDialogs(resolvedProjectId);

  // Persisted preferences from zustand store
  const {
    statusFilter: storedStatusFilter,
    priorityFilter,
    tagFilter: storedTagFilter,
    sortBy,
    hierarchyView,
    showArchived,
    pageViewMode,
    showValidationIssuesOnly,
    setStatusFilter,
    setPriorityFilter,
    setTagFilter,
    setSortBy,
    setHierarchyView,
    setShowArchived,
    setPageViewMode,
    setShowValidationIssuesOnly,
  } = useSpecsPreferencesStore();

  const [searchParams] = useSearchParams();
  const initialQueryParams = useMemo(() => ({
    tag: searchParams.get('tag'),
    query: searchParams.get('q'),
    view: searchParams.get('view'),
    groupByParent: searchParams.get('groupByParent'),
  }), [searchParams]);

  // URL params can override stored filters for deep linking
  const initialQuery = initialQueryParams.query ?? '';
  const initialTag = initialQueryParams.tag;
  const initialView = initialQueryParams.view;
  const initialGroupByParent = initialQueryParams.groupByParent;

  // Local search query (not persisted)
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  // Defer expensive filtering so the input stays responsive while typing
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Backend search for content-aware, relevance-ranked results
  const searchResults = useSearchSpecs(resolvedProjectId ?? null, deferredSearchQuery);

  // Compute effective values considering URL overrides
  const statusFilter = useMemo(() => storedStatusFilter.filter(s => s !== 'archived'), [storedStatusFilter]);
  const tagFilter = useMemo(() => initialTag ? [initialTag] : storedTagFilter, [initialTag, storedTagFilter]);
  const groupByParent = useMemo(() =>
    initialGroupByParent === '1' || initialGroupByParent === 'true' ? true : hierarchyView,
    [initialGroupByParent, hierarchyView]
  );
  const viewMode = useMemo(() =>
    (initialView === 'board' || initialView === 'list') ? initialView : pageViewMode,
    [initialView, pageViewMode]
  ) as ViewMode;

  // Wrapper setters that update the store
  const setGroupByParent = useCallback((value: boolean) => setHierarchyView(value), [setHierarchyView]);
  const setViewMode = useCallback((mode: ViewMode) => setPageViewMode(mode), [setPageViewMode]);

  // Batch metadata query (tokens, validation) — fires as soon as specs are available.
  // TanStack Query handles caching, deduplication, and prevents duplicate requests.
  const specNames = useMemo(() => specs.map(s => s.specName), [specs]);
  const batchMetadataQuery = useBatchMetadata(resolvedProjectId ?? null, specNames);
  const [draftGuard, setDraftGuard] = useState<{ spec: Spec; nextStatus: SpecStatus } | null>(null);

  // Merge metadata into specs cache when batch data arrives
  useEffect(() => {
    if (!batchMetadataQuery.data) return;
    const batchResult = batchMetadataQuery.data;

    updateSpecsCache((prevSpecs) =>
      prevSpecs.map((spec) => {
        const metadata = batchResult.specs[spec.specName];
        if (metadata) {
          return {
            ...spec,
            tokenCount: metadata.tokenCount,
            tokenStatus: metadata.tokenStatus,
            validationStatus: metadata.validationStatus,
          };
        }
        return spec;
      })
    );
  }, [batchMetadataQuery.data, updateSpecsCache]);

  // Derive validation statuses from batch metadata for the validation filter
  const validationStatuses = useMemo<Record<string, ValidationStatus>>(() => {
    if (!batchMetadataQuery.data) return {};
    const statuses: Record<string, ValidationStatus> = {};
    for (const [specName, metadata] of Object.entries(batchMetadataQuery.data.specs)) {
      statuses[specName] = metadata.validationStatus as ValidationStatus;
    }
    return statuses;
  }, [batchMetadataQuery.data]);

  const loadingValidation = batchMetadataQuery.isLoading;

  const applyStatusChange = useCallback(async (spec: Spec, newStatus: SpecStatus, force = false) => {
    if (machineModeEnabled && !isMachineAvailable()) {
      return;
    }
    // Optimistic update
    updateSpecsCache((prev) =>
      prev.map((item) =>
        item.specName === spec.specName ? { ...item, status: newStatus } : item
      )
    );

    try {
      await api.updateSpec(spec.specName, {
        status: newStatus,
        expectedContentHash: spec.contentHash,
        force,
      });
      queryClient.invalidateQueries({ queryKey: specKeys.lists() });
    } catch (err) {
      // Revert on error
      updateSpecsCache((prev) =>
        prev.map((item) =>
          item.specName === spec.specName ? { ...item, status: spec.status } : item
        )
      );
      console.error('Failed to update status:', err);
    }
  }, [isMachineAvailable, machineModeEnabled, queryClient, updateSpecsCache]);

  const handleStatusChange = useCallback((spec: Spec, newStatus: SpecStatus) => {
    if (spec.status === 'draft' && (newStatus === 'in-progress' || newStatus === 'complete')) {
      setDraftGuard({ spec, nextStatus: newStatus });
      return;
    }
    void applyStatusChange(spec, newStatus);
  }, [applyStatusChange]);

  const handlePriorityChange = useCallback(async (spec: Spec, newPriority: string) => {
    if (machineModeEnabled && !isMachineAvailable()) {
      return;
    }
    const oldPriority = spec.priority;
    // Optimistic update
    updateSpecsCache((prev) =>
      prev.map((item) =>
        item.specName === spec.specName ? { ...item, priority: newPriority } : item
      )
    );

    try {
      await api.updateSpec(spec.specName, { priority: newPriority, expectedContentHash: spec.contentHash });
      queryClient.invalidateQueries({ queryKey: specKeys.lists() });
    } catch (err) {
      // Revert on error
      updateSpecsCache((prev) =>
        prev.map((item) =>
          item.specName === spec.specName ? { ...item, priority: oldPriority } : item
        )
      );
      console.error('Failed to update priority:', err);
    }
  }, [isMachineAvailable, machineModeEnabled, queryClient, updateSpecsCache]);

  const refreshSpecs = useCallback(() => {
    void specsQuery.refetch();
  }, [specsQuery]);

  // Get unique values for filters
  const uniqueStatuses = useMemo(() => {
    const statuses = specs.map((s) => s.status).filter((s): s is SpecStatus => Boolean(s));
    // Only include 'archived' when showArchived is enabled
    const uniqueSet = Array.from(new Set(statuses)).filter(s => showArchived || s !== 'archived');
    // Sort by defined order: planned -> in-progress -> complete -> archived
    const statusOrder: Record<SpecStatus, number> = {
      'draft': 0,
      'planned': 1,
      'in-progress': 2,
      'complete': 3,
      'archived': 4,
    };
    return uniqueSet.sort((a, b) => statusOrder[a] - statusOrder[b]);
  }, [specs, showArchived]);
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
    setStatusFilter([]);
    setPriorityFilter([]);
    setTagFilter([]);
    setShowValidationIssuesOnly(false);
    // Note: settings (groupByParent, showArchived) and view preferences are not cleared
  }, [setStatusFilter, setPriorityFilter, setTagFilter, setShowValidationIssuesOnly]);

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
    // When searching with backend results, use search API matches as the base set.
    // This enables content search and relevance ranking from the server.
    // Falls back to client-side substring matching while search is loading.
    let baseSpecs = specs;
    const hasBackendResults = deferredSearchQuery && searchResults.data;

    if (hasBackendResults) {
      const matchingNames = new Set(searchResults.data.results.map((r: Spec) => r.specName));
      baseSpecs = specs.filter(s => matchingNames.has(s.specName));
    }

    let filtered = baseSpecs.filter(spec => {
      // Hide archived specs by default unless showArchived is true
      if (!showArchived && spec.status === 'archived') {
        return false;
      }

      // Client-side fallback while backend search is loading
      if (deferredSearchQuery && !hasBackendResults) {
        const query = deferredSearchQuery.toLowerCase();
        const matchesSearch =
          spec.specName.toLowerCase().includes(query) ||
          (spec.title ? spec.title.toLowerCase().includes(query) : false) ||
          spec.tags?.some((tag: string) => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      if (statusFilter.length > 0 && spec.status && !statusFilter.includes(spec.status)) {
        return false;
      }

      if (priorityFilter.length > 0 && spec.priority && !priorityFilter.includes(spec.priority)) {
        return false;
      }

      if (tagFilter.length > 0 && !spec.tags?.some(tag => tagFilter.includes(tag))) {
        return false;
      }

      if (showValidationIssuesOnly) {
        // Check both the spec's own validationStatus and the separately fetched status
        const fetchedStatus = validationStatuses[spec.specName];
        const effectiveStatus = spec.validationStatus || fetchedStatus;
        const hasIssues = effectiveStatus && effectiveStatus !== 'pass';
        if (!hasIssues) return false;
      }

      return true;
    });

    // For groupByParent mode, expand to include all descendants of matching specs
    // This ensures umbrella specs show their full hierarchy for progress visibility
    if (groupByParent && (statusFilter.length > 0 || priorityFilter.length > 0)) {
      filtered = expandWithDescendants(filtered, specs);
    }

    const sorted = [...filtered];

    // When searching with backend results, preserve relevance ordering
    if (hasBackendResults) {
      const orderMap = new Map(searchResults.data.results.map((r: Spec, i: number) => [r.specName, i]));
      sorted.sort((a, b) => (orderMap.get(a.specName) ?? 9999) - (orderMap.get(b.specName) ?? 9999));
    } else {
      switch (sortBy) {
        case 'id-asc':
          sorted.sort((a, b) => (a.specNumber || 0) - (b.specNumber || 0));
          break;
        case 'priority-desc':
          sorted.sort((a, b) => {
            const priorityOrder: Record<string, number> = {
              'critical': 4,
              'high': 3,
              'medium': 2,
              'low': 1,
            };
            const scoreA = priorityOrder[a.priority || ''] || 0;
            const scoreB = priorityOrder[b.priority || ''] || 0;
            const cmp = scoreB - scoreA;
            return cmp !== 0 ? cmp : (b.specNumber || 0) - (a.specNumber || 0);
          });
          break;
        case 'priority-asc':
          sorted.sort((a, b) => {
            const priorityOrder: Record<string, number> = {
              'critical': 4,
              'high': 3,
              'medium': 2,
              'low': 1,
            };
            const scoreA = priorityOrder[a.priority || ''] || 0;
            const scoreB = priorityOrder[b.priority || ''] || 0;
            const cmp = scoreA - scoreB;
            return cmp !== 0 ? cmp : (b.specNumber || 0) - (a.specNumber || 0);
          });
          break;
        case 'updated-desc':
          sorted.sort((a, b) => {
            if (!a.updatedAt) return 1;
            if (!b.updatedAt) return -1;
            const aTime = new Date(a.updatedAt).getTime();
            const bTime = new Date(b.updatedAt).getTime();
            const timeDiff = bTime - aTime;
            return timeDiff !== 0 ? timeDiff : (b.specNumber || 0) - (a.specNumber || 0);
          });
          break;
        case 'title-asc':
          sorted.sort((a, b) => {
            const titleA = (a.title || a.specName).toLowerCase();
            const titleB = (b.title || b.specName).toLowerCase();
            const cmp = titleA.localeCompare(titleB);
            return cmp !== 0 ? cmp : (b.specNumber || 0) - (a.specNumber || 0);
          });
          break;
        case 'id-desc':
        default:
          sorted.sort((a, b) => (b.specNumber || 0) - (a.specNumber || 0));
          break;
      }
    }

    return sorted;
  }, [priorityFilter, deferredSearchQuery, sortBy, specs, statusFilter, tagFilter, groupByParent, expandWithDescendants, showValidationIssuesOnly, showArchived, validationStatuses, searchResults.data]);

  // Rendering hundreds of inline Select controls (status + priority) causes heavy mount cost.
  // Keep inline badge editing for smaller result sets and fall back to read-only badges for large sets.
  const allowInlineBadgeEditing = filteredSpecs.length <= INLINE_EDIT_MAX_ITEMS;

  if (isInitialLoading) {
    return (
      <PageContainer>
        <SpecListSkeleton />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="flex justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="text-lg font-semibold">{t('specsPage.state.errorTitle')}</div>
            <p className="text-sm text-muted-foreground">{error || t('specsPage.state.errorDescription')}</p>
            <Button variant="secondary" size="sm" onClick={refreshSpecs} className="mt-2">
              {t('actions.retry')}
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      className="h-[calc(100dvh-3.5rem)]"
      contentClassName="flex h-full flex-col gap-4"
    >
      <div className="flex flex-col gap-4 sticky top-0 bg-background mt-0 py-2 z-10">
        <PageHeader
          title={t('specsPage.title')}
          description={t('specsPage.description')}
        />

        {machineModeEnabled && !isMachineAvailable() && (
          <div className="text-xs text-destructive">
            {t('machines.unavailable')}
          </div>
        )}

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
          onSortByChange={(value) => setSortBy(value as SpecsSortOption)}
          uniqueStatuses={uniqueStatuses}
          uniquePriorities={uniquePriorities}
          uniqueTags={uniqueTags}
          onClearFilters={handleClearFilters}
          totalSpecs={specs.length}
          filteredCount={filteredSpecs.length}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          groupByParent={groupByParent}
          onGroupByParentChange={setGroupByParent}
          showValidationIssuesOnly={showValidationIssuesOnly}
          onShowValidationIssuesOnlyChange={setShowValidationIssuesOnly}
          showArchived={showArchived}
          onShowArchivedChange={setShowArchived}
          loadingValidation={loadingValidation}
        />
      </div>

      <div className="flex-1 min-h-0">
        {specs.length === 0 ? (
          <EmptyState
            icon={FileQuestion}
            title={t('specsPage.state.noSpecsTitle')}
            description={t('specsPage.state.noSpecsDescription')}
            actions={(
              <Button variant="secondary" size="sm" onClick={refreshSpecs}>
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
                <Button variant="secondary" size="sm" onClick={refreshSpecs}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  {t('specsPage.buttons.reloadData')}
                </Button>
              </div>
            )}
          />
        ) : viewMode === 'list' ? (
          <ListView
            specs={filteredSpecs}
            hierarchy={hierarchy}
            basePath={basePath}
            groupByParent={groupByParent}
            sortBy={sortBy}
            onTokenClick={handleTokenClick}
            onValidationClick={handleValidationClick}
            onStatusChange={allowInlineBadgeEditing ? handleStatusChange : undefined}
            onPriorityChange={allowInlineBadgeEditing ? handlePriorityChange : undefined}
          />) : (
          <BoardView
            specs={filteredSpecs}
            onStatusChange={handleStatusChange}
            onPriorityChange={allowInlineBadgeEditing ? handlePriorityChange : undefined}
            canEdit={!machineModeEnabled || isMachineAvailable()}
            basePath={basePath}
            groupByParent={groupByParent}
            showArchived={showArchived}
            onTokenClick={handleTokenClick}
            onValidationClick={handleValidationClick}
          />
        )}
      </div>

      {activeSpecName && tokenDialogOpen && (
        <TokenDetailsDialog
          open={tokenDialogOpen}
          onClose={closeTokenDialog}
          specName={activeSpecName}
          data={tokenDialogData}
          loading={tokenDialogLoading}
        />
      )}

      {activeSpecName && validationDialogOpen && (
        <ValidationDialog
          open={validationDialogOpen}
          onClose={closeValidationDialog}
          specName={activeSpecName}
          data={validationDialogData}
          loading={validationDialogLoading}
        />
      )}

      <Dialog open={Boolean(draftGuard)} onOpenChange={(open) => !open && setDraftGuard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editors.draftSkipTitle')}</DialogTitle>
            <DialogDescription>{t('editors.draftSkipDescription')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!draftGuard) return;
                void applyStatusChange(draftGuard.spec, 'planned');
                setDraftGuard(null);
              }}
            >
              {t('editors.draftSkipPlanned')}
            </Button>
            <Button
              onClick={() => {
                if (!draftGuard) return;
                void applyStatusChange(draftGuard.spec, draftGuard.nextStatus, true);
                setDraftGuard(null);
              }}
            >
              {t('editors.draftSkipForce')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
