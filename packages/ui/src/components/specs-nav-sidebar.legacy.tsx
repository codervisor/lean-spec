import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  ListTree,
  AlignJustify,
  Archive,
  ArrowUpDown
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  cn,
  formatRelativeTime,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  HierarchyTree,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  buildHierarchy,
  getAllParentIds,
  SearchInput,
  type SortOption
} from '@/library';
import {
  List,
  type ListImperativeAPI,
} from 'react-window';
import { StatusBadge } from './status-badge';
import { PriorityBadge } from './priority-badge';
import { UmbrellaBadge } from './umbrella-badge';
import { getStatusLabel, getPriorityLabel } from '@/lib/badge-config';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import type { Spec } from '../types/api';
import { useTranslation } from 'react-i18next';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { useSpecsList } from '../hooks/useSpecsQuery';
import { SpecsNavSidebarSkeleton } from './shared/skeletons';
import { useSpecsPreferencesStore, useSpecsSidebarStore } from '../stores/specs-preferences';
import { storage, STORAGE_KEYS } from '../lib/storage';

interface SpecsNavSidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function SpecsNavSidebar({ mobileOpen = false, onMobileOpenChange }: SpecsNavSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject } = useCurrentProject();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const specsQuery = useSpecsList(resolvedProjectId ?? null);
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';

  // Derive specs and loading from query (avoids cascading renders)
  const specs = useMemo(() => (specsQuery.data as Spec[]) ?? [], [specsQuery.data]);
  const loading = !currentProject || specsQuery.isLoading;

  const [searchQuery, setSearchQuery] = useState('');
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  // Persisted preferences from zustand store
  const {
    statusFilter,
    priorityFilter,
    tagFilter,
    sortBy,
    hierarchyView,
    showArchived,
    expandedNodeIds,
    setStatusFilter,
    setPriorityFilter,
    setTagFilter,
    setSortBy,
    setHierarchyView,
    setShowArchived,
    setExpandedNodeIds,
    clearFilters,
  } = useSpecsPreferencesStore();

  const { collapsed, setCollapsed } = useSpecsSidebarStore();

  // Local UI state (not persisted)
  const [showFilters, setShowFilters] = useState(false);
  const [listHeight, setListHeight] = useState<number>(() => calculateListHeight());

  // Derived state
  const viewMode = hierarchyView ? 'tree' : 'list';
  const setViewMode = useCallback((mode: 'list' | 'tree') => {
    setHierarchyView(mode === 'tree');
  }, [setHierarchyView]);

  // Convert expandedNodeIds array to Set for tree component
  const expandedIds = useMemo(() => new Set(expandedNodeIds), [expandedNodeIds]);
  const setExpandedIds = useCallback((ids: Set<string>) => {
    setExpandedNodeIds(Array.from(ids));
  }, [setExpandedNodeIds]);

  // Scroll uses sessionStorage (transient) - keeping it but using cleaner key?
  // Spec says: "Keep scroll position as sessionStorage (transient by nature)"
  // But usage of lib/storage.ts is good.
  const [initialScrollOffset] = useState<number>(() => {
    return storage.get(STORAGE_KEYS.SIDEBAR_SCROLL, 0, true);
  });
  const { t, i18n } = useTranslation('common');

  const listRef = useRef<ListImperativeAPI>(null);
  const mobileOpenRef = useRef(mobileOpen);
  const hasRestoredInitialScroll = useRef(false);

  const activeSpecId = useMemo(() => {
    const match = location.pathname.match(/\/specs\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : '';
  }, [location.pathname]);

  const prevActiveSpecId = useRef(activeSpecId);
  const activeSpec = useMemo(() => specs.find(s => s.specName === activeSpecId), [specs, activeSpecId]);
  const activeSpecActualId = activeSpec?.id || activeSpecId;

  // Log query errors (no setState needed)
  useEffect(() => {
    if (specsQuery.error) {
      console.error('Failed to load specs for sidebar', specsQuery.error);
    }
  }, [specsQuery.error]);

  useEffect(() => {
    const handler = () => setListHeight(calculateListHeight());
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--specs-nav-sidebar-width',
      collapsed ? '0px' : '280px'
    );
  }, [collapsed]);

  useEffect(() => {
    mobileOpenRef.current = mobileOpen;
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpenRef.current) return;
    onMobileOpenChange?.(false);
  }, [location.pathname, onMobileOpenChange]);

  const handleSpecClick = useCallback((spec: Spec) => {
    const path = `${basePath}/specs/${spec.specName}`;
    navigate(path);
    if (mobileOpen) onMobileOpenChange?.(false);
  }, [basePath, navigate, mobileOpen, onMobileOpenChange]);

  // Helper: expand filtered specs to include all descendants (for tree view)
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

  // Fuse.js instance for fuzzy search (matches QuickSearch behavior)
  const fuse = useMemo(
    () =>
      new Fuse(specs, {
        keys: [
          { name: 'title', weight: 2 },
          { name: 'specNumber', weight: 1.5 },
          { name: 'specName', weight: 1 },
          { name: 'tags', weight: 0.5 },
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 2,
      }),
    [specs]
  );

  const filteredSpecs = useMemo(() => {
    let result = specs;

    // Create base specs list that respects archived filter for descendant expansion
    let baseSpecs = specs;

    // Hide archived specs by default unless showArchived is true or archived is explicitly selected in status filter
    if (!showArchived && !statusFilter.includes('archived')) {
      result = result.filter((spec) => spec.status !== 'archived');
      baseSpecs = result;
    }

    if (searchQuery) {
      // Use Fuse.js for fuzzy search (same as QuickSearch)
      const fuseResults = fuse.search(searchQuery);
      const matchedSpecNames = new Set(fuseResults.map((r) => r.item.specName));
      result = result.filter((spec) => matchedSpecNames.has(spec.specName));
    }

    if (statusFilter.length > 0) {
      result = result.filter((spec) => spec.status && statusFilter.includes(spec.status));
    }

    if (priorityFilter.length > 0) {
      result = result.filter((spec) => spec.priority && priorityFilter.includes(spec.priority));
    }

    if (tagFilter.length > 0) {
      result = result.filter((spec) =>
        spec.tags?.some((tag: string) => tagFilter.includes(tag))
      );
    }

    // For tree view, expand to include all descendants of matching specs
    // This ensures umbrella specs show their full hierarchy for progress visibility
    // Use baseSpecs (which respects archived filter) instead of full specs
    if (viewMode === 'tree' && (statusFilter.length > 0 || priorityFilter.length > 0)) {
      result = expandWithDescendants(result, baseSpecs);
    }

    return [...result].sort((a, b) => {
      const priorityOrder: Record<string, number> = {
        'critical': 4,
        'high': 3,
        'medium': 2,
        'low': 1,
      };
      switch (sortBy) {
        case 'id-asc':
          return (a.specNumber || 0) - (b.specNumber || 0);
        case 'updated-desc': {
          if (!a.updatedAt) return 1;
          if (!b.updatedAt) return -1;
          const timeDiff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          return timeDiff !== 0 ? timeDiff : (b.specNumber || 0) - (a.specNumber || 0);
        }
        case 'title-asc': {
          const cmp = (a.title || a.specName || '').toLowerCase().localeCompare((b.title || b.specName || '').toLowerCase());
          return cmp !== 0 ? cmp : (b.specNumber || 0) - (a.specNumber || 0);
        }
        case 'title-desc': {
          const cmp = (b.title || b.specName || '').toLowerCase().localeCompare((a.title || a.specName || '').toLowerCase());
          return cmp !== 0 ? cmp : (b.specNumber || 0) - (a.specNumber || 0);
        }
        case 'priority-desc': {
          const scoreA = priorityOrder[a.priority || ''] || 0;
          const scoreB = priorityOrder[b.priority || ''] || 0;
          const cmp = scoreB - scoreA;
          return cmp !== 0 ? cmp : (b.specNumber || 0) - (a.specNumber || 0);
        }
        case 'priority-asc': {
          const scoreA = priorityOrder[a.priority || ''] || 0;
          const scoreB = priorityOrder[b.priority || ''] || 0;
          const cmp = scoreA - scoreB;
          return cmp !== 0 ? cmp : (b.specNumber || 0) - (a.specNumber || 0);
        }
        case 'id-desc':
        default:
          return (b.specNumber || 0) - (a.specNumber || 0);
      }
    });
  }, [specs, searchQuery, statusFilter, priorityFilter, tagFilter, viewMode, expandWithDescendants, showArchived, sortBy, fuse]);


  const treeRoots = useMemo(() => {
    if (viewMode !== 'tree') return [];
    return buildHierarchy(filteredSpecs as Spec[], sortBy as SortOption);
  }, [filteredSpecs, sortBy, viewMode]);

  const allParentIds = useMemo(() => getAllParentIds(treeRoots), [treeRoots]);
  const hasInitializedExpansion = useRef(false);

  // Initialize expansion state on first load (if no stored state)
  useEffect(() => {
    if (viewMode === 'tree' && !hasInitializedExpansion.current && allParentIds.size > 0) {
      // Only expand all if no stored state exists
      if (expandedNodeIds.length === 0) {
        setExpandedIds(allParentIds);
      }
      hasInitializedExpansion.current = true;
    }
  }, [viewMode, allParentIds, expandedNodeIds.length, setExpandedIds]);

  const RowComponent = useCallback(
    (rowProps: { index: number; style: CSSProperties }) => {
      const { index, style } = rowProps;
      const spec = filteredSpecs[index];
      const isActive = spec?.specName === activeSpecId;
      const displayTitle = spec?.title || spec?.specName;

      if (!spec) {
        return <div style={style} />;
      }

      return (
        <div style={style} className="px-2 py-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to={`${basePath}/specs/${spec.specName}`}
                onClick={() => onMobileOpenChange?.(false)}
                className={cn(
                  'flex flex-col gap-1 p-1.5 rounded-md text-sm transition-colors h-full justify-center',
                  isActive
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'hover:bg-accent/50'
                )}
              >
                <div className="flex items-center gap-1.5 w-full">
                  {spec.specNumber && (
                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                      #{spec.specNumber}
                    </span>
                  )}
                  <span className="truncate text-xs leading-relaxed flex-1">{displayTitle}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap w-full">
                  {spec.status && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <StatusBadge status={spec.status} iconOnly className="text-[10px] scale-90" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {getStatusLabel(spec.status, t)}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {spec.priority && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <PriorityBadge priority={spec.priority} iconOnly className="text-[10px] scale-90" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {getPriorityLabel(spec.priority, t)}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {spec.children && spec.children.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <UmbrellaBadge iconOnly className="h-3 w-3 text-muted-600 dark:text-muted-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {t('specs.hierarchy.umbrella')}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {spec.updatedAt && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(spec.updatedAt, i18n.language)}
                    </span>
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
    [activeSpecId, basePath, filteredSpecs, i18n.language, onMobileOpenChange, t]
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    specs.forEach((spec) => spec.tags?.forEach((tag: string) => set.add(tag)));
    return Array.from(set).sort();
  }, [specs]);

  const statusOptions = useMemo(() => {
    const options: Array<'draft' | 'planned' | 'in-progress' | 'complete'> = [
      'planned',
      'in-progress',
      'complete',
    ];
    if (specs.some((spec) => spec.status === 'draft')) {
      options.unshift('draft');
    }
    return options;
  }, [specs]);

  const hasActiveFilters =
    statusFilter.length > 0 || priorityFilter.length > 0 || tagFilter.length > 0;

  // Restore initial scroll position only once on mount
  useEffect(() => {
    if (viewMode === 'tree') return; // Skip for tree view
    const el = listRef.current?.element;
    if (!el || hasRestoredInitialScroll.current) return;

    if (initialScrollOffset > 0) {
      el.scrollTop = initialScrollOffset;
      hasRestoredInitialScroll.current = true;
    }
  }, [initialScrollOffset, listHeight, showFilters, filteredSpecs.length, viewMode]);

  // Scroll to active spec when it changes or on initial load (if no stored scroll offset)
  useEffect(() => {
    if (viewMode === 'tree') return; // Skip for tree view
    // Wait until the specs are loaded AND the list is actually rendered.
    if (loading) return;
    if (!activeSpecId || filteredSpecs.length === 0) return;
    if (!listRef.current) return;

    // Skip if active spec hasn't changed and we've already handled the initial scroll behavior.
    if (prevActiveSpecId.current === activeSpecId && hasRestoredInitialScroll.current) return;

    const targetIndex = filteredSpecs.findIndex((spec) => spec.specName === activeSpecId);
    if (targetIndex >= 0) {
      // Defer to the next frame so the list has committed layout.
      const raf = requestAnimationFrame(() => {
        listRef.current?.scrollToRow({ index: targetIndex, align: 'smart', behavior: 'smooth' });
      });
      hasRestoredInitialScroll.current = true;
      prevActiveSpecId.current = activeSpecId;
      return () => cancelAnimationFrame(raf);
    }

    // Active spec isn't currently visible (e.g., filtered out). Don't mark initial scroll
    // as handled so we can scroll once it becomes visible again.
    prevActiveSpecId.current = activeSpecId;
  }, [filteredSpecs, activeSpecId, initialScrollOffset, loading, viewMode]);

  useEffect(() => {
    if (viewMode === 'tree') return;
    const el = listRef.current?.element;
    if (!el) return;

    const onScroll = () => {
      storage.set(STORAGE_KEYS.SIDEBAR_SCROLL, el.scrollTop, true);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [viewMode]);

  const toggleStatus = (status: string) => {
    const newFilter = statusFilter.includes(status)
      ? statusFilter.filter((s) => s !== status)
      : [...statusFilter, status];
    setStatusFilter(newFilter);
  };

  const togglePriority = (priority: string) => {
    const newFilter = priorityFilter.includes(priority)
      ? priorityFilter.filter((p) => p !== priority)
      : [...priorityFilter, priority];
    setPriorityFilter(newFilter);
  };

  const toggleTag = (tag: string) => {
    const newFilter = tagFilter.includes(tag)
      ? tagFilter.filter((t) => t !== tag)
      : [...tagFilter, tag];
    setTagFilter(newFilter);
  };

  const sidebarVisible = mobileOpen || !collapsed;

  return (
    <TooltipProvider delayDuration={700}>
      <div className="relative">
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => onMobileOpenChange?.(false)}
          />
        )}

        <aside
          className={cn(
            'border-r bg-background flex flex-col overflow-hidden transition-all duration-300 flex-shrink-0',
            mobileOpen
              ? 'fixed inset-y-0 left-0 z-50 w-[280px] shadow-xl'
              : 'hidden lg:flex lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]',
            collapsed && !mobileOpen ? 'lg:w-0 lg:border-r-0' : 'lg:w-[280px]'
          )}
        >
          <div className="p-3 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">{t('specsNavSidebar.title')}</h2>

              <div className="flex items-center gap-1">
                <Button
                  variant={viewMode === 'tree' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode(viewMode === 'list' ? 'tree' : 'list')}
                  title={viewMode === 'list' ? t('specsNavSidebar.switchToTree') : t('specsNavSidebar.switchToList')}
                >
                  {viewMode === 'list' ? <ListTree className="h-4 w-4" /> : <AlignJustify className="h-4 w-4" />}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={sortBy !== 'id-desc' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 w-7 p-0"
                      title={t('specsNavSidebar.sort.label')}
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuLabel>{t('specsNavSidebar.sort.label')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortBy('id-desc')}>
                      {t('specsNavSidebar.sort.newest')}
                      {sortBy === 'id-desc' && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('id-asc')}>
                      {t('specsNavSidebar.sort.oldest')}
                      {sortBy === 'id-asc' && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('updated-desc')}>
                      {t('specsNavSidebar.sort.updated')}
                      {sortBy === 'updated-desc' && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortBy('title-asc')}>
                      {t('specsNavSidebar.sort.titleAsc')}
                      {sortBy === 'title-asc' && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('title-desc')}>
                      {t('specsNavSidebar.sort.titleDesc')}
                      {sortBy === 'title-desc' && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortBy('priority-desc')}>
                      {t('specsNavSidebar.sort.priorityHigh')}
                      {sortBy === 'priority-desc' && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('priority-asc')}>
                      {t('specsNavSidebar.sort.priorityLow')}
                      {sortBy === 'priority-asc' && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Popover open={showFilters} onOpenChange={setShowFilters}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={showFilters || hasActiveFilters || showArchived ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 w-7 p-0"
                      title={showFilters ? t('specsNavSidebar.toggleFilters.hide') : t('specsNavSidebar.toggleFilters.show')}
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-80 p-0" align="start" sideOffset={8}>
                    <div className="flex items-center justify-between px-4 py-2 border-b">
                      <span className="font-medium text-sm py-1">{t('specsNavSidebar.filtersLabel')}</span>
                      {(hasActiveFilters || showArchived) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto px-2 py-1 text-xs"
                          onClick={() => {
                            clearFilters();
                            setShowArchived(false);
                          }}
                        >
                          {t('specsNavSidebar.clearFilters')}
                        </Button>
                      )}
                    </div>
                    <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                      <Accordion type="multiple" className="w-full">
                        <AccordionItem value="status" className="border-b-0">
                          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 hover:no-underline text-xs">
                            {statusFilter.length === 0
                              ? t('specsNavSidebar.select.status.all')
                              : `${t('specsNavSidebar.status')}: ${statusFilter.length} ${t('specsNavSidebar.selected')}`}
                          </AccordionTrigger>
                          <AccordionContent className="pb-2">
                            <div className="space-y-1 px-2">
                              {statusOptions.map((status) => (
                                <div
                                  key={status}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer group"
                                  onClick={() => toggleStatus(status)}
                                >
                                  <div className={cn("flex items-center justify-center w-4 h-4 border rounded transition-colors", statusFilter.includes(status) ? "bg-primary border-primary text-primary-foreground" : "group-hover:border-primary/50")}>
                                    {statusFilter.includes(status) && (
                                      <Check className="h-3 w-3" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-1">
                                    <StatusBadge status={status} iconOnly className="scale-90" />
                                    <span className="text-sm">
                                      {getStatusLabel(status, t)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {showArchived && (
                                <div
                                  key="archived"
                                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer group"
                                  onClick={() => toggleStatus('archived')}
                                >
                                  <div className={cn("flex items-center justify-center w-4 h-4 border rounded transition-colors", statusFilter.includes('archived') ? "bg-primary border-primary text-primary-foreground" : "group-hover:border-primary/50")}>
                                    {statusFilter.includes('archived') && (
                                      <Check className="h-3 w-3" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-1">
                                    <StatusBadge status="archived" iconOnly className="scale-90" />
                                    <span className="text-sm">
                                      {getStatusLabel('archived', t)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="priority" className="border-b-0 border-t">
                          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 hover:no-underline text-xs">
                            {priorityFilter.length === 0
                              ? t('specsNavSidebar.select.priority.all')
                              : `${t('specsNavSidebar.priority')}: ${priorityFilter.length} ${t('specsNavSidebar.selected')}`}
                          </AccordionTrigger>
                          <AccordionContent className="pb-2">
                            <div className="space-y-1 px-2">
                              {(['critical', 'high', 'medium', 'low'] as const).map((priority) => (
                                <div
                                  key={priority}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer group"
                                  onClick={() => togglePriority(priority)}
                                >
                                  <div className={cn("flex items-center justify-center w-4 h-4 border rounded transition-colors", priorityFilter.includes(priority) ? "bg-primary border-primary text-primary-foreground" : "group-hover:border-primary/50")}>
                                    {priorityFilter.includes(priority) && (
                                      <Check className="h-3 w-3" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-1">
                                    <PriorityBadge priority={priority} iconOnly className="scale-90" />
                                    <span className="text-sm">
                                      {getPriorityLabel(priority, t)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {allTags.length > 0 && (
                          <AccordionItem value="tags" className="border-b-0 border-t">
                            <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 hover:no-underline text-xs">
                              {tagFilter.length === 0
                                ? t('specsNavSidebar.select.tag.all')
                                : `${t('specsNavSidebar.tags')}: ${tagFilter.length} ${t('specsNavSidebar.selected')}`}
                            </AccordionTrigger>
                            <AccordionContent className="pb-2">
                              <div className="px-2 pb-2">
                                <div className="relative">
                                  <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                  <Input
                                    type="text"
                                    placeholder={t('specsNavSidebar.searchTags')}
                                    value={tagSearchQuery}
                                    onChange={(e) => setTagSearchQuery(e.target.value)}
                                    className="h-8 pl-8 text-xs bg-background"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1 px-2 max-h-48 overflow-y-auto">
                                {allTags
                                  .filter(tag => tag.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                                  .map((tag) => (
                                    <div
                                      key={tag}
                                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer group"
                                      onClick={() => toggleTag(tag)}
                                    >
                                      <div className={cn("flex items-center justify-center w-4 h-4 border rounded transition-colors", tagFilter.includes(tag) ? "bg-primary border-primary text-primary-foreground" : "group-hover:border-primary/50")}>
                                        {tagFilter.includes(tag) && (
                                          <Check className="h-3 w-3" />
                                        )}
                                      </div>
                                      <span className="text-sm flex-1 break-all">{tag}</span>
                                    </div>
                                  ))}
                                {allTags.filter(tag => tag.toLowerCase().includes(tagSearchQuery.toLowerCase())).length === 0 && (
                                  <div className="text-xs text-muted-foreground text-center py-2">
                                    {t('specsNavSidebar.noTagsFound')}
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                      </Accordion>

                      {/* Show Archived Toggle */}
                      <div
                        className="flex items-center gap-2 px-4 py-3 border-t hover:bg-accent cursor-pointer group"
                        onClick={() => {
                          const newValue = !showArchived;
                          setShowArchived(newValue);
                          // Clear archived from status filter when hiding archived specs
                          if (!newValue && statusFilter.includes('archived')) {
                            setStatusFilter(statusFilter.filter(s => s !== 'archived'));
                          }
                        }}
                      >
                        <div className={cn("flex items-center justify-center w-4 h-4 border rounded transition-colors", showArchived ? "bg-primary border-primary text-primary-foreground" : "group-hover:border-primary/50")}>
                          {showArchived && (
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                          <Archive className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {t('specsNavSidebar.showArchived')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                {onMobileOpenChange && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 lg:hidden"
                    onClick={() => onMobileOpenChange(false)}
                    title={t('actions.close')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hidden lg:flex"
                  onClick={() => setCollapsed(true)}
                  title={t('specSidebar.collapse')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('specsNavSidebar.searchPlaceholder')}
              showShortcut={false}
              className="h-9 text-sm"
            />

          </div>

          <div className="flex-1 overflow-hidden">
            {loading ? (
              <SpecsNavSidebarSkeleton />
            ) : filteredSpecs.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {t('specsNavSidebar.noResults')}
              </div>
            ) : viewMode === 'tree' ? (
              <div className="h-full px-2 py-0.5">
                <HierarchyTree
                  specs={filteredSpecs as Spec[]}
                  onSpecClick={handleSpecClick}
                  selectedSpecId={activeSpecActualId}
                  height={listHeight}
                  sortBy={sortBy as 'id-desc' | 'id-asc' | 'updated-desc' | 'title-asc' | 'title-desc' | 'priority-desc' | 'priority-asc'}
                  expandedIds={expandedIds}
                  onExpandedChange={setExpandedIds}
                />
              </div>
            ) : (
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
            )}
          </div>
        </aside>

        {!sidebarVisible && (
          <Button
            variant="ghost"
            size="sm"
            className="hidden lg:flex h-9 w-5 p-0 absolute z-50 top-2 left-0 bg-background border border-l-0 rounded-r-md rounded-l-none shadow-md hover:w-6 hover:bg-accent transition-all items-center justify-center"
            onClick={() => setCollapsed(false)}
            title={t('specSidebar.expand')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}

function calculateListHeight() {
  if (typeof window === 'undefined') return 600;
  const headerHeight = 56; // top navigation bar
  const controlsHeight = 100;
  return window.innerHeight - headerHeight - controlsHeight;
}
