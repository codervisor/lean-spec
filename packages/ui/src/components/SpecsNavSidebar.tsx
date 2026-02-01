import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  ListTree,
  AlignJustify,
  Archive
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
  HierarchyTree
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
import { useTranslation } from 'react-i18next';
import { useProject, useSpecs } from '../contexts';
import { SpecsNavSidebarSkeleton } from './shared/Skeletons';

const STORAGE_KEYS = {
  collapsed: 'specs-nav-sidebar-collapsed',
  scroll: 'specs-nav-sidebar-scroll-offset',
  statusFilter: 'specs-nav-sidebar-status-filter',
  priorityFilter: 'specs-nav-sidebar-priority-filter',
  tagFilter: 'specs-nav-sidebar-tag-filter',
  showArchived: 'specs-nav-sidebar-show-archived',
};

// Shared key for hierarchy view - synced with SpecsPage
const HIERARCHY_VIEW_KEY = 'specs-hierarchy-view';

interface SpecsNavSidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function SpecsNavSidebar({ mobileOpen = false, onMobileOpenChange }: SpecsNavSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject } = useProject();
  const { refreshTrigger } = useSpecs();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagSearchQuery, setTagSearchQuery] = useState('');
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
  const [showArchived, setShowArchived] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(STORAGE_KEYS.showArchived) === 'true';
  });
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.collapsed) === 'true';
  });
  const [viewMode, setViewMode] = useState<'list' | 'tree'>(() => {
    if (typeof window === 'undefined') return 'list';
    return sessionStorage.getItem(HIERARCHY_VIEW_KEY) === 'true' ? 'tree' : 'list';
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
  const activeSpec = useMemo(() => specs.find(s => s.specName === activeSpecId), [specs, activeSpecId]);
  const activeSpecActualId = activeSpec?.id || activeSpecId;

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
    sessionStorage.setItem(HIERARCHY_VIEW_KEY, String(viewMode === 'tree'));
  }, [viewMode]);

  // Sync viewMode when changed from SpecsPage (storage event)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === HIERARCHY_VIEW_KEY && e.storageArea === sessionStorage) {
        setViewMode(e.newValue === 'true' ? 'tree' : 'list');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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

  const filteredSpecs = useMemo(() => {
    let result = specs;

    // Hide archived specs by default unless showArchived is true or archived is explicitly selected in status filter
    if (!showArchived && !statusFilter.includes('archived')) {
      result = result.filter((spec) => spec.status !== 'archived');
    }

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

    // For tree view, expand to include all descendants of matching specs
    // This ensures umbrella specs show their full hierarchy for progress visibility
    if (viewMode === 'tree' && (statusFilter.length > 0 || priorityFilter.length > 0)) {
      result = expandWithDescendants(result, specs);
    }

    return [...result].sort((a, b) => (b.specNumber || 0) - (a.specNumber || 0));
  }, [specs, searchQuery, statusFilter, priorityFilter, tagFilter, viewMode, expandWithDescendants, showArchived]);

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

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.showArchived, String(showArchived));
  }, [showArchived]);

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
      sessionStorage.setItem(STORAGE_KEYS.scroll, String(el.scrollTop));
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [viewMode]);

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
                            resetFilters();
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
                              {(['planned', 'in-progress', 'complete'] as const).map((status) => (
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
                                    placeholder={t('specsNavSidebar.searchTags') ?? 'Search tags...'}
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
                                    {t('specsNavSidebar.noTagsFound') ?? 'No tags found'}
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
                            setStatusFilter(prev => prev.filter(s => s !== 'archived'));
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

            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('specsNavSidebar.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>

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
