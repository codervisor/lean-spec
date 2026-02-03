import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, FileQuestion, FilterX, RefreshCcw } from 'lucide-react';
import { Button, Card, CardContent } from '@leanspec/ui-components';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Spec, SpecStatus, ValidationStatus } from '../types/api';
import { getBackend } from '../lib/backend-adapter';
import { BoardView } from '../components/specs/BoardView';
import { ListView } from '../components/specs/ListView';
import { SpecsFilters } from '../components/specs/SpecsFilters';
import { TokenDetailsDialog } from '../components/specs/TokenDetailsDialog';
import { ValidationDialog } from '../components/specs/ValidationDialog';
import { cn } from '@leanspec/ui-components';
import { SpecListSkeleton } from '../components/shared/Skeletons';
import { PageHeader } from '../components/shared/PageHeader';
import { EmptyState } from '../components/shared/EmptyState';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { specKeys, useSpecsWithHierarchy } from '../hooks/useSpecsQuery';
import { useLayoutStore } from '../stores/layout';
import { useMachineStore } from '../stores/machine';
import { useSpecActionDialogs } from '../hooks/useSpecActionDialogs';
import { useTranslation } from 'react-i18next';
import { storage, STORAGE_KEYS } from '../lib/storage';

type ViewMode = 'list' | 'board';
type SortOption = 'id-desc' | 'id-asc' | 'updated-desc' | 'title-asc' | 'priority-desc' | 'priority-asc';

const STORAGE_KEY = 'specs-page-preferences';

interface SpecsPagePreferences {
  viewMode: ViewMode;
  sortBy: SortOption;
  statusFilter: string[];
  priorityFilter: string[];
  tagFilter: string[];
  // groupByParent moved to localStorage with shared key
  showValidationIssuesOnly: boolean;
  showArchived: boolean;
}

const DEFAULT_PREFERENCES: SpecsPagePreferences = {
  viewMode: 'list',
  sortBy: 'id-desc',
  statusFilter: [],
  priorityFilter: [],
  tagFilter: [],
  showValidationIssuesOnly: false,
  showArchived: false,
};

function loadHierarchyView(): boolean {
  return storage.get(STORAGE_KEYS.HIERARCHY_VIEW, false);
}

function saveHierarchyView(value: boolean): void {
  storage.set(STORAGE_KEYS.HIERARCHY_VIEW, value);
}

function loadPreferences(): SpecsPagePreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(saved) as Partial<SpecsPagePreferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function savePreferences(prefs: Partial<SpecsPagePreferences>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadPreferences();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {
    // Ignore storage errors
  }
}

export function SpecsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject } = useCurrentProject();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';
  const { isWideMode } = useLayoutStore();
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
          const data = old as { specs: Spec[]; [key: string]: unknown };
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

  // Load saved preferences
  const savedPrefs = useMemo(() => loadPreferences(), []);

  const [searchParams] = useSearchParams();
  const initialQueryParams = useMemo(() => ({
    tag: searchParams.get('tag'),
    query: searchParams.get('q'),
    view: searchParams.get('view'),
    groupByParent: searchParams.get('groupByParent'),
  }), [searchParams]);

  // Filters (initialized from localStorage)
  const initialQuery = initialQueryParams.query ?? '';
  const initialTag = initialQueryParams.tag;
  const initialView = initialQueryParams.view;
  const initialGroupByParent = initialQueryParams.groupByParent;

  // Filters (initialized from localStorage + query params)
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<string[]>(savedPrefs.statusFilter.filter(s => s !== 'archived'));
  const [priorityFilter, setPriorityFilter] = useState<string[]>(savedPrefs.priorityFilter);
  const [tagFilter, setTagFilter] = useState<string[]>(
    initialTag ? [initialTag] : savedPrefs.tagFilter
  );
  const [sortBy, setSortBy] = useState<SortOption>(savedPrefs.sortBy);
  const [groupByParent, setGroupByParent] = useState(
    initialGroupByParent === '1' || initialGroupByParent === 'true'
      ? true
      : loadHierarchyView()
  );
  const [showValidationIssuesOnly, setShowValidationIssuesOnly] = useState(savedPrefs.showValidationIssuesOnly);
  const [showArchived, setShowArchived] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEYS.SHOW_ARCHIVED) !== null) {
      return storage.get(STORAGE_KEYS.SHOW_ARCHIVED, false);
    }
    return savedPrefs.showArchived;
  });

  // Validation statuses fetched when showValidationIssuesOnly is enabled
  const [validationStatuses, setValidationStatuses] = useState<Record<string, ValidationStatus>>({});
  const [loadingValidation, setLoadingValidation] = useState(false);
  const validationFetchedRef = useRef(false);
  const metadataFetchedRef = useRef(false);

  // View State (initialized from localStorage)
  const [viewMode, setViewMode] = useState<ViewMode>(
    initialView === 'board' || initialView === 'list' ? initialView : savedPrefs.viewMode
  );

  // Fetch batch metadata (tokens, validation) after specs load
  useEffect(() => {
    if (metadataFetchedRef.current || specs.length === 0 || !resolvedProjectId || isInitialLoading) {
      return;
    }

    const fetchMetadata = async () => {
      const backend = getBackend();

      try {
        const specNames = specs.map((spec) => spec.specName);
        const batchResult = await backend.getBatchMetadata(resolvedProjectId, specNames);

        // Update specs with metadata
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

        // Also update validation statuses for filter
        const statuses: Record<string, ValidationStatus> = {};
        for (const [specName, metadata] of Object.entries(batchResult.specs)) {
          statuses[specName] = metadata.validationStatus as ValidationStatus;
        }
        setValidationStatuses(statuses);
        validationFetchedRef.current = true;
      } catch {
        // Silently fail - specs still work without metadata
      }

      metadataFetchedRef.current = true;
    };

    void fetchMetadata();
  }, [specs, resolvedProjectId, isInitialLoading, updateSpecsCache]);

  // Reset metadata fetch flag when project changes
  useEffect(() => {
    metadataFetchedRef.current = false;
    validationFetchedRef.current = false;
  }, [resolvedProjectId]);

  // Fetch validation statuses when filter is enabled (if not already fetched)
  useEffect(() => {
    if (!showValidationIssuesOnly || validationFetchedRef.current || specs.length === 0 || !resolvedProjectId) {
      return;
    }

    const fetchValidation = async () => {
      setLoadingValidation(true);
      const backend = getBackend();
      const statuses: Record<string, ValidationStatus> = {};

      try {
        // Fetch metadata for all specs in a single batch request
        const specNames = specs.map((spec) => spec.specName);
        const batchResult = await backend.getBatchMetadata(resolvedProjectId, specNames);

        for (const [specName, metadata] of Object.entries(batchResult.specs)) {
          statuses[specName] = metadata.validationStatus as ValidationStatus;
        }
      } catch {
        // Fall back silently if batch fails
      }

      setValidationStatuses(statuses);
      setLoadingValidation(false);
      validationFetchedRef.current = true;
    };

    void fetchValidation();
  }, [showValidationIssuesOnly, specs, resolvedProjectId]);


  // Persist preferences to localStorage (except groupByParent which uses sessionStorage)
  useEffect(() => {
    savePreferences({
      viewMode,
      sortBy,
      statusFilter,
      priorityFilter,
      tagFilter,
      showValidationIssuesOnly,
      showArchived,
    });
  }, [viewMode, sortBy, statusFilter, priorityFilter, tagFilter, showValidationIssuesOnly, showArchived]);

  // Persist groupByParent to localStorage (shared with sidebar)
  useEffect(() => {
    saveHierarchyView(groupByParent);
  }, [groupByParent]);

  // Sync groupByParent when changed from sidebar (storage event)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.HIERARCHY_VIEW && e.storageArea === localStorage) {
        setGroupByParent(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync showArchived to standalone storage
  useEffect(() => {
    storage.set(STORAGE_KEYS.SHOW_ARCHIVED, showArchived);
  }, [showArchived]);

  // Migration
  useEffect(() => {
    if (typeof window === 'undefined') return;
    storage.migrateFromSessionToLocal('specs-hierarchy-view', STORAGE_KEYS.HIERARCHY_VIEW);
    
    // Check if we need to migrate showArchived from combined object to standalone key
    if (localStorage.getItem(STORAGE_KEYS.SHOW_ARCHIVED) === null && savedPrefs.showArchived) {
        storage.set(STORAGE_KEYS.SHOW_ARCHIVED, true);
    }
  }, [savedPrefs]);

  const handleStatusChange = useCallback(async (spec: Spec, newStatus: SpecStatus) => {
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
      await api.updateSpec(spec.specName, { status: newStatus, expectedContentHash: spec.contentHash });
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
      // Hide archived specs by default unless showArchived is true
      if (!showArchived && spec.status === 'archived') {
        return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
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

    return sorted;
  }, [priorityFilter, searchQuery, sortBy, specs, statusFilter, tagFilter, groupByParent, expandWithDescendants, showValidationIssuesOnly, showArchived, validationStatuses]);

  if (isInitialLoading) {
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
            <Button variant="secondary" size="sm" onClick={refreshSpecs} className="mt-2">
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
          onSortByChange={(value) => setSortBy(value as SortOption)}
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
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
          />) : (
          <BoardView
            specs={filteredSpecs}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
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
    </div>
  );
}
