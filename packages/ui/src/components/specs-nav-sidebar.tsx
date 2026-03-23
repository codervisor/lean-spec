import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import {
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  ListTree,
  AlignJustify,
  ArrowUpDown,
} from 'lucide-react';
import {
  Button,
  cn,
  Popover,
  PopoverContent,
  PopoverTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  buildHierarchy,
  getAllParentIds,
  SearchInput,
  type SortOption,
} from '@/library';
import { type ListImperativeAPI } from 'react-window';
import { TooltipProvider } from './tooltip';
import type { Spec } from '../types/api';
import { useTranslation } from 'react-i18next';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { useSpecsList } from '../hooks/useSpecsQuery';
import { useSessions } from '../hooks/useSessionsQuery';
import { useSpecsPreferencesStore, useSpecsSidebarStore } from '../stores/specs-preferences';
import { storage, STORAGE_KEYS } from '../lib/storage';

import { SidebarFilters } from './specs-nav/sidebar-filters';
import { SidebarSpecList } from './specs-nav/sidebar-spec-list';

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
  const sessionsQuery = useSessions(resolvedProjectId ?? null);
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';

  const specs = useMemo(() => (specsQuery.data as Spec[]) ?? [], [specsQuery.data]);
  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const loading = !currentProject || specsQuery.isLoading;

  const sessionStatusBySpec = useMemo(() => {
    const map = new Map<string, 'running' | 'attention' | 'completed'>();
    const completedWindowMs = 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const session of sessions) {
      for (const specId of session.specIds ?? []) {
        const current = map.get(specId);
        if (current === 'running') continue;

        if (session.status === 'running') {
          map.set(specId, 'running');
          continue;
        }

        if (!current && (session.status === 'pending' || session.status === 'paused')) {
          map.set(specId, 'attention');
          continue;
        }

        const endedAtMs = session.endedAt ? new Date(session.endedAt).getTime() : NaN;
        const startedAtMs = session.startedAt ? new Date(session.startedAt).getTime() : NaN;
        const recentTs = Number.isFinite(endedAtMs) ? endedAtMs : startedAtMs;
        const isRecent = Number.isFinite(recentTs) && now - recentTs < completedWindowMs;

        if (!current && session.status === 'completed' && isRecent) {
          map.set(specId, 'completed');
        }
      }
    }

    return map;
  }, [sessions]);

  const [searchQuery, setSearchQuery] = useState('');
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  const {
    statusFilter, priorityFilter, tagFilter, sortBy, hierarchyView, showArchived, expandedNodeIds,
    setStatusFilter, setPriorityFilter, setTagFilter, setSortBy, setHierarchyView, setShowArchived,
    setExpandedNodeIds, clearFilters,
  } = useSpecsPreferencesStore();

  const { collapsed, setCollapsed } = useSpecsSidebarStore();
  const [showFilters, setShowFilters] = useState(false);
  const [listHeight, setListHeight] = useState<number>(() => calculateListHeight());

  const viewMode = hierarchyView ? 'tree' : 'list';
  const setViewMode = useCallback((mode: 'list' | 'tree') => setHierarchyView(mode === 'tree'), [setHierarchyView]);
  const expandedIds = useMemo(() => new Set(expandedNodeIds), [expandedNodeIds]);
  const setExpandedIds = useCallback((ids: Set<string>) => setExpandedNodeIds(Array.from(ids)), [setExpandedNodeIds]);
  const [initialScrollOffset] = useState<number>(() => storage.get(STORAGE_KEYS.SIDEBAR_SCROLL, 0, true));
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

  useEffect(() => { if (specsQuery.error) console.error('Failed to load specs for sidebar', specsQuery.error); }, [specsQuery.error]);
  useEffect(() => { const h = () => setListHeight(calculateListHeight()); h(); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  useEffect(() => { document.documentElement.style.setProperty('--specs-nav-sidebar-width', collapsed ? '0px' : '280px'); }, [collapsed]);
  useEffect(() => { mobileOpenRef.current = mobileOpen; }, [mobileOpen]);
  useEffect(() => { if (!mobileOpenRef.current) return; onMobileOpenChange?.(false); }, [location.pathname, onMobileOpenChange]);

  const handleSpecClick = useCallback((spec: Spec) => {
    navigate(`${basePath}/specs/${spec.specName}`);
    if (mobileOpen) onMobileOpenChange?.(false);
  }, [basePath, navigate, mobileOpen, onMobileOpenChange]);

  const expandWithDescendants = useCallback((filtered: Spec[], allSpecs: Spec[]): Spec[] => {
    const childrenMap = new Map<string, Spec[]>();
    for (const spec of allSpecs) {
      if (spec.parent) {
        if (!childrenMap.has(spec.parent)) childrenMap.set(spec.parent, []);
        childrenMap.get(spec.parent)!.push(spec);
      }
    }
    const resultIds = new Set(filtered.map(s => s.specName || s.id));
    const addDescendants = (specId: string) => {
      const children = childrenMap.get(specId);
      if (children) for (const child of children) {
        const childId = child.specName || child.id;
        if (childId && !resultIds.has(childId)) { resultIds.add(childId); addDescendants(childId); }
      }
    };
    for (const spec of filtered) addDescendants(spec.specName || spec.id || '');
    return allSpecs.filter(s => resultIds.has(s.specName || s.id || ''));
  }, []);

  const fuse = useMemo(() => new Fuse(specs, {
    keys: [{ name: 'title', weight: 2 }, { name: 'specNumber', weight: 1.5 }, { name: 'specName', weight: 1 }, { name: 'tags', weight: 0.5 }],
    threshold: 0.4, includeScore: true, minMatchCharLength: 2,
  }), [specs]);

  const filteredSpecs = useMemo(() => {
    let result = specs;
    let baseSpecs = specs;
    if (!showArchived && !statusFilter.includes('archived')) {
      result = result.filter((s) => s.status !== 'archived');
      baseSpecs = result;
    }
    if (searchQuery) {
      const matched = new Set(fuse.search(searchQuery).map((r) => r.item.specName));
      result = result.filter((s) => matched.has(s.specName));
    }
    if (statusFilter.length > 0) result = result.filter((s) => s.status && statusFilter.includes(s.status));
    if (priorityFilter.length > 0) result = result.filter((s) => s.priority && priorityFilter.includes(s.priority));
    if (tagFilter.length > 0) result = result.filter((s) => s.tags?.some((tag: string) => tagFilter.includes(tag)));
    if (viewMode === 'tree' && (statusFilter.length > 0 || priorityFilter.length > 0)) result = expandWithDescendants(result, baseSpecs);
    const priorityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'id-asc': return (a.specNumber || 0) - (b.specNumber || 0);
        case 'updated-desc': { if (!a.updatedAt) return 1; if (!b.updatedAt) return -1; const d = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(); return d || (b.specNumber || 0) - (a.specNumber || 0); }
        case 'title-asc': { const c = (a.title || a.specName || '').toLowerCase().localeCompare((b.title || b.specName || '').toLowerCase()); return c || (b.specNumber || 0) - (a.specNumber || 0); }
        case 'title-desc': { const c = (b.title || b.specName || '').toLowerCase().localeCompare((a.title || a.specName || '').toLowerCase()); return c || (b.specNumber || 0) - (a.specNumber || 0); }
        case 'priority-desc': { return (priorityOrder[b.priority || ''] || 0) - (priorityOrder[a.priority || ''] || 0) || (b.specNumber || 0) - (a.specNumber || 0); }
        case 'priority-asc': { return (priorityOrder[a.priority || ''] || 0) - (priorityOrder[b.priority || ''] || 0) || (b.specNumber || 0) - (a.specNumber || 0); }
        default: return (b.specNumber || 0) - (a.specNumber || 0);
      }
    });
  }, [specs, searchQuery, statusFilter, priorityFilter, tagFilter, viewMode, expandWithDescendants, showArchived, sortBy, fuse]);

  const treeRoots = useMemo(() => viewMode !== 'tree' ? [] : buildHierarchy(filteredSpecs, sortBy as SortOption), [filteredSpecs, sortBy, viewMode]);
  const allParentIds = useMemo(() => getAllParentIds(treeRoots), [treeRoots]);
  const hasInitializedExpansion = useRef(false);

  useEffect(() => {
    if (viewMode === 'tree' && !hasInitializedExpansion.current && allParentIds.size > 0) {
      if (expandedNodeIds.length === 0) setExpandedIds(allParentIds);
      hasInitializedExpansion.current = true;
    }
  }, [viewMode, allParentIds, expandedNodeIds.length, setExpandedIds]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    specs.forEach((s) => s.tags?.forEach((tag: string) => set.add(tag)));
    return Array.from(set).sort();
  }, [specs]);

  const statusOptions = useMemo(() => {
    const opts: Array<'draft' | 'planned' | 'in-progress' | 'complete'> = ['planned', 'in-progress', 'complete'];
    if (specs.some((s) => s.status === 'draft')) opts.unshift('draft');
    return opts;
  }, [specs]);

  const hasActiveFilters = statusFilter.length > 0 || priorityFilter.length > 0 || tagFilter.length > 0;

  // Scroll restoration
  useEffect(() => {
    if (viewMode === 'tree') return;
    const el = listRef.current?.element;
    if (!el || hasRestoredInitialScroll.current) return;
    if (initialScrollOffset > 0) { el.scrollTop = initialScrollOffset; hasRestoredInitialScroll.current = true; }
  }, [initialScrollOffset, listHeight, showFilters, filteredSpecs.length, viewMode]);

  useEffect(() => {
    if (viewMode === 'tree' || loading || !activeSpecId || filteredSpecs.length === 0 || !listRef.current) return;
    if (prevActiveSpecId.current === activeSpecId && hasRestoredInitialScroll.current) return;
    const idx = filteredSpecs.findIndex((s) => s.specName === activeSpecId);
    if (idx >= 0) {
      const raf = requestAnimationFrame(() => listRef.current?.scrollToRow({ index: idx, align: 'smart', behavior: 'smooth' }));
      hasRestoredInitialScroll.current = true;
      prevActiveSpecId.current = activeSpecId;
      return () => cancelAnimationFrame(raf);
    }
    prevActiveSpecId.current = activeSpecId;
  }, [filteredSpecs, activeSpecId, initialScrollOffset, loading, viewMode]);

  useEffect(() => {
    if (viewMode === 'tree') return;
    const el = listRef.current?.element;
    if (!el) return;
    const onScroll = () => storage.set(STORAGE_KEYS.SIDEBAR_SCROLL, el.scrollTop, true);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [viewMode]);

  const toggleStatus = (s: string) => setStatusFilter(statusFilter.includes(s) ? statusFilter.filter((x) => x !== s) : [...statusFilter, s]);
  const togglePriority = (p: string) => setPriorityFilter(priorityFilter.includes(p) ? priorityFilter.filter((x) => x !== p) : [...priorityFilter, p]);
  const toggleTag = (tag: string) => setTagFilter(tagFilter.includes(tag) ? tagFilter.filter((x) => x !== tag) : [...tagFilter, tag]);
  const sidebarVisible = mobileOpen || !collapsed;

  return (
    <TooltipProvider delayDuration={700}>
      <div className="relative">
        {mobileOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => onMobileOpenChange?.(false)} />}

        <aside className={cn(
          'border-r bg-background flex flex-col overflow-hidden transition-all duration-300 flex-shrink-0',
          mobileOpen ? 'fixed inset-y-0 left-0 z-50 w-[280px] shadow-xl' : 'hidden lg:flex lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)]',
          collapsed && !mobileOpen ? 'lg:w-0 lg:border-r-0' : 'lg:w-[280px]'
        )}>
          <div className="p-3 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">{t('specsNavSidebar.title')}</h2>
              <div className="flex items-center gap-1">
                <Button variant={viewMode === 'tree' ? 'secondary' : 'ghost'} size="sm" className="h-7 w-7 p-0"
                  onClick={() => setViewMode(viewMode === 'list' ? 'tree' : 'list')}
                  title={viewMode === 'list' ? t('specsNavSidebar.switchToTree') : t('specsNavSidebar.switchToList')}>
                  {viewMode === 'list' ? <ListTree className="h-4 w-4" /> : <AlignJustify className="h-4 w-4" />}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={sortBy !== 'id-desc' ? 'secondary' : 'ghost'} size="sm" className="h-7 w-7 p-0" title={t('specsNavSidebar.sort.label')}>
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuLabel>{t('specsNavSidebar.sort.label')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {([['id-desc', 'newest'], ['id-asc', 'oldest'], ['updated-desc', 'updated']] as const).map(([key, label]) => (
                      <DropdownMenuItem key={key} onClick={() => setSortBy(key)}>{t(`specsNavSidebar.sort.${label}`)}{sortBy === key && <Check className="ml-auto h-4 w-4" />}</DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    {([['title-asc', 'titleAsc'], ['title-desc', 'titleDesc']] as const).map(([key, label]) => (
                      <DropdownMenuItem key={key} onClick={() => setSortBy(key)}>{t(`specsNavSidebar.sort.${label}`)}{sortBy === key && <Check className="ml-auto h-4 w-4" />}</DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    {([['priority-desc', 'priorityHigh'], ['priority-asc', 'priorityLow']] as const).map(([key, label]) => (
                      <DropdownMenuItem key={key} onClick={() => setSortBy(key)}>{t(`specsNavSidebar.sort.${label}`)}{sortBy === key && <Check className="ml-auto h-4 w-4" />}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Popover open={showFilters} onOpenChange={setShowFilters}>
                  <PopoverTrigger asChild>
                    <Button variant={showFilters || hasActiveFilters || showArchived ? 'secondary' : 'ghost'} size="sm" className="h-7 w-7 p-0"
                      title={showFilters ? t('specsNavSidebar.toggleFilters.hide') : t('specsNavSidebar.toggleFilters.show')}>
                      <Filter className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start" sideOffset={8}>
                    <SidebarFilters
                      statusFilter={statusFilter}
                      priorityFilter={priorityFilter}
                      tagFilter={tagFilter}
                      showArchived={showArchived}
                      statusOptions={statusOptions}
                      allTags={allTags}
                      tagSearchQuery={tagSearchQuery}
                      onTagSearchQueryChange={setTagSearchQuery}
                      onToggleStatus={toggleStatus}
                      onTogglePriority={togglePriority}
                      onToggleTag={toggleTag}
                      onToggleArchived={() => {
                        const newValue = !showArchived;
                        setShowArchived(newValue);
                        if (!newValue && statusFilter.includes('archived')) setStatusFilter(statusFilter.filter(s => s !== 'archived'));
                      }}
                      onClearAll={() => { clearFilters(); setShowArchived(false); }}
                      t={t}
                    />
                  </PopoverContent>
                </Popover>

                {onMobileOpenChange && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 lg:hidden" onClick={() => onMobileOpenChange(false)} title={t('actions.close')}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hidden lg:flex" onClick={() => setCollapsed(true)} title={t('specSidebar.collapse')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder={t('specsNavSidebar.searchPlaceholder')} showShortcut={false} className="h-9 text-sm" />
          </div>

          <div className="flex-1 overflow-hidden">
            <SidebarSpecList
              loading={loading}
              filteredSpecs={filteredSpecs as Spec[]}
              activeSpecId={activeSpecId}
              selectedSpecId={activeSpecActualId}
              basePath={basePath}
              viewMode={viewMode}
              sortBy={sortBy}
              listHeight={listHeight}
              listRef={listRef}
              expandedIds={expandedIds}
              onExpandedChange={setExpandedIds}
              onSpecClick={handleSpecClick}
              onMobileClose={() => onMobileOpenChange?.(false)}
              t={t}
              language={i18n.language}
              sessionStatusBySpec={sessionStatusBySpec}
            />
          </div>
        </aside>

        {!sidebarVisible && (
          <Button variant="ghost" size="sm"
            className="hidden lg:flex h-9 w-5 p-0 absolute z-50 top-2 left-0 bg-background border border-l-0 rounded-r-md rounded-l-none shadow-md hover:w-6 hover:bg-accent transition-all items-center justify-center"
            onClick={() => setCollapsed(false)} title={t('specSidebar.expand')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}

function calculateListHeight() {
  if (typeof window === 'undefined') return 600;
  return window.innerHeight - 56 - 100;
}
