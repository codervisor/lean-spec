import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  PlayCircle,
  CheckCircle2,
  Archive,
  AlertCircle,
  ArrowUp,
  Minus,
  ArrowDown,
  Check,
} from 'lucide-react';
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@leanspec/ui-components';
import {
  List,
  type ListImperativeAPI,
} from 'react-window';
import { StatusBadge, getStatusLabel } from './StatusBadge';
import { PriorityBadge, getPriorityLabel } from './PriorityBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './Tooltip';
import { api } from '../lib/api';
import type { Spec } from '../types/api';
import { cn } from '../lib/utils';
import { formatRelativeTime } from '../lib/date-utils';
import { useTranslation } from 'react-i18next';
import { useProject, useSpecs } from '../contexts';

const STORAGE_KEYS = {
  collapsed: 'specs-nav-sidebar-collapsed',
  scroll: 'specs-nav-sidebar-scroll-offset',
  statusFilter: 'specs-nav-sidebar-status-filter',
  priorityFilter: 'specs-nav-sidebar-priority-filter',
  tagFilter: 'specs-nav-sidebar-tag-filter',
};

interface SpecsNavSidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function SpecsNavSidebar({ mobileOpen = false, onMobileOpenChange }: SpecsNavSidebarProps) {
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject } = useProject();
  const { refreshTrigger } = useSpecs();
  const basePath = projectId ? `/projects/${projectId}` : '/projects/default';
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = sessionStorage.getItem(STORAGE_KEYS.statusFilter);
    return stored ? JSON.parse(stored) : [];
  });
  const [priorityFilter, setPriorityFilter] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = sessionStorage.getItem(STORAGE_KEYS.priorityFilter);
    return stored ? JSON.parse(stored) : [];
  });
  const [tagFilter, setTagFilter] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = sessionStorage.getItem(STORAGE_KEYS.tagFilter);
    return stored ? JSON.parse(stored) : [];
  });
  const [showFilters, setShowFilters] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.collapsed) === 'true';
  });
  const [listHeight, setListHeight] = useState<number>(() => calculateListHeight());
  const [initialScrollOffset] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const stored = sessionStorage.getItem(STORAGE_KEYS.scroll);
    return stored ? parseFloat(stored) : 0;
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

  useEffect(() => {
    // Wait for project to be available before loading specs
    if (!currentProject) {
      setLoading(true);
      return;
    }

    async function loadSpecs() {
      try {
        setLoading(true);
        const data = await api.getSpecs();
        setSpecs(data);
      } catch (err) {
        console.error('Failed to load specs for sidebar', err);
      } finally {
        setLoading(false);
      }
    }
    loadSpecs();
  }, [currentProject, refreshTrigger]);

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
    localStorage.setItem(STORAGE_KEYS.collapsed, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    mobileOpenRef.current = mobileOpen;
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpenRef.current) return;
    onMobileOpenChange?.(false);
  }, [location.pathname, onMobileOpenChange]);

  const filteredSpecs = useMemo(() => {
    let result = specs;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (spec) =>
          spec.title?.toLowerCase().includes(query) ||
          spec.specName.toLowerCase().includes(query) ||
          spec.specNumber?.toString().includes(query)
      );
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

    return [...result].sort((a, b) => (b.specNumber || 0) - (a.specNumber || 0));
  }, [specs, searchQuery, statusFilter, priorityFilter, tagFilter]);

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
        <div style={style} className="px-1">
          <div className="mb-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to={`${basePath}/specs/${spec.specName}`}
                  onClick={() => onMobileOpenChange?.(false)}
                  className={cn(
                    'flex flex-col gap-1 p-1.5 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'hover:bg-accent/50'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {spec.specNumber && (
                      <span className="text-xs font-mono text-muted-foreground shrink-0">
                        #{spec.specNumber}
                      </span>
                    )}
                    <span className="truncate text-xs leading-relaxed">{displayTitle}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
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

  const hasActiveFilters =
    statusFilter.length > 0 || priorityFilter.length > 0 || tagFilter.length > 0;

  // Persist filters to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.statusFilter, JSON.stringify(statusFilter));
  }, [statusFilter]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.priorityFilter, JSON.stringify(priorityFilter));
  }, [priorityFilter]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.tagFilter, JSON.stringify(tagFilter));
  }, [tagFilter]);

  // Restore initial scroll position only once on mount
  useEffect(() => {
    const el = listRef.current?.element;
    if (!el || hasRestoredInitialScroll.current) return;

    if (initialScrollOffset > 0) {
      el.scrollTop = initialScrollOffset;
      hasRestoredInitialScroll.current = true;
    }
  }, [initialScrollOffset, listHeight, showFilters, filteredSpecs.length]);

  // Scroll to active spec when it changes or on initial load (if no stored scroll offset)
  useEffect(() => {
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
  }, [filteredSpecs, activeSpecId, initialScrollOffset, loading]);

  useEffect(() => {
    const el = listRef.current?.element;
    if (!el) return;

    const onScroll = () => {
      sessionStorage.setItem(STORAGE_KEYS.scroll, String(el.scrollTop));
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const resetFilters = () => {
    setStatusFilter([]);
    setPriorityFilter([]);
    setTagFilter([]);
  };

  const toggleStatus = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const togglePriority = (priority: string) => {
    setPriorityFilter((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]
    );
  };

  const toggleTag = (tag: string) => {
    setTagFilter((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
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
            'border-r bg-background flex flex-col overflow-hidden',
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
                  variant={showFilters || hasActiveFilters ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setShowFilters((prev) => !prev)}
                  title={showFilters ? t('specsNavSidebar.toggleFilters.hide') : t('specsNavSidebar.toggleFilters.show')}
                >
                  <Filter className="h-4 w-4" />
                </Button>
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

            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('specsNavSidebar.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            {showFilters && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{t('specsNavSidebar.filtersLabel')}</span>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={resetFilters}
                    >
                      {t('specsNavSidebar.clearFilters')}
                    </Button>
                  )}
                </div>

                {/* Status Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-full justify-between text-xs font-normal"
                    >
                      <span className="truncate">
                        {statusFilter.length === 0
                          ? t('specsNavSidebar.select.status.all')
                          : `${t('specsNavSidebar.status')}: ${statusFilter.length} ${t('specsNavSidebar.selected')}`}
                      </span>
                      <ChevronRight className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="space-y-1">
                      {(['planned', 'in-progress', 'complete', 'archived'] as const).map((status) => (
                        <div
                          key={status}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                          onClick={() => toggleStatus(status)}
                        >
                          <div className="flex items-center justify-center w-4 h-4 border rounded">
                            {statusFilter.includes(status) && (
                              <Check className="h-3 w-3" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-1">
                            {status === 'planned' && <Clock className="h-4 w-4" />}
                            {status === 'in-progress' && <PlayCircle className="h-4 w-4" />}
                            {status === 'complete' && <CheckCircle2 className="h-4 w-4" />}
                            {status === 'archived' && <Archive className="h-4 w-4" />}
                            <span className="text-sm">
                              {status === 'planned' && t('status.planned')}
                              {status === 'in-progress' && t('status.inProgress')}
                              {status === 'complete' && t('status.complete')}
                              {status === 'archived' && t('status.archived')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Priority Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-full justify-between text-xs font-normal"
                    >
                      <span className="truncate">
                        {priorityFilter.length === 0
                          ? t('specsNavSidebar.select.priority.all')
                          : `${t('specsNavSidebar.priority')}: ${priorityFilter.length} ${t('specsNavSidebar.selected')}`}
                      </span>
                      <ChevronRight className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="space-y-1">
                      {(['low', 'medium', 'high', 'critical'] as const).map((priority) => (
                        <div
                          key={priority}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                          onClick={() => togglePriority(priority)}
                        >
                          <div className="flex items-center justify-center w-4 h-4 border rounded">
                            {priorityFilter.includes(priority) && (
                              <Check className="h-3 w-3" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-1">
                            {priority === 'low' && <ArrowDown className="h-4 w-4" />}
                            {priority === 'medium' && <Minus className="h-4 w-4" />}
                            {priority === 'high' && <ArrowUp className="h-4 w-4" />}
                            {priority === 'critical' && <AlertCircle className="h-4 w-4" />}
                            <span className="text-sm">
                              {priority === 'low' && t('priority.low')}
                              {priority === 'medium' && t('priority.medium')}
                              {priority === 'high' && t('priority.high')}
                              {priority === 'critical' && t('priority.critical')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Tag Filter */}
                {allTags.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-full justify-between text-xs font-normal"
                      >
                        <span className="truncate">
                          {tagFilter.length === 0
                            ? t('specsNavSidebar.select.tag.all')
                            : `${t('specsNavSidebar.tags')}: ${tagFilter.length} ${t('specsNavSidebar.selected')}`}
                        </span>
                        <ChevronRight className="h-3 w-3 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2 max-h-64 overflow-y-auto" align="start">
                      <div className="space-y-1">
                        {allTags.map((tag) => (
                          <div
                            key={tag}
                            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                            onClick={() => toggleTag(tag)}
                          >
                            <div className="flex items-center justify-center w-4 h-4 border rounded">
                              {tagFilter.includes(tag) && (
                                <Check className="h-3 w-3" />
                              )}
                            </div>
                            <span className="text-sm flex-1">{tag}</span>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {t('actions.loading')}
              </div>
            ) : filteredSpecs.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {t('specsNavSidebar.noResults')}
              </div>
            ) : (
              <List<Record<string, never>>
                listRef={listRef}
                defaultHeight={listHeight}
                rowCount={filteredSpecs.length}
                rowHeight={76}
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
            className="hidden lg:flex h-10 w-5 p-0 absolute z-50 top-2 left-0 bg-background border border-l-0 rounded-r-md rounded-l-none shadow-md hover:w-6 hover:bg-accent transition-all items-center justify-center"
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
