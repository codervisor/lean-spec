'use client';

import * as React from 'react';
import Link from 'next/link';
import { List, type ListImperativeAPI } from 'react-window';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  List as ListIconLucide,
  Filter,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge, getStatusLabel } from '@/components/status-badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { extractH1Title } from '@/lib/utils';
import { PriorityBadge, getPriorityLabel } from './priority-badge';
import { formatRelativeTime } from '@/lib/date-utils';
import { useSpecsSidebarState, updateSidebarScrollTop } from '@/lib/stores/specs-sidebar-store';
import type { SidebarSpec } from '@/types/specs';

interface SpecsNavSidebarProps {
  initialSpecs?: SidebarSpec[];
  currentSpecId?: string;
  currentSubSpec?: string;
  onSpecHover?: (specId: string) => void;
}

export function SpecsNavSidebar({ initialSpecs = [], currentSpecId, currentSubSpec, onSpecHover }: SpecsNavSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');
  const [tagFilter, setTagFilter] = React.useState<string>('all');
  const [showFilters, setShowFilters] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('specs-nav-sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const activeItemRef = React.useRef<HTMLAnchorElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const scrollFrameRef = React.useRef<number | null>(null);
  const sidebarState = useSpecsSidebarState();
  const cachedSpecs = sidebarState.specs.length > 0 ? sidebarState.specs : initialSpecs;
  const resolvedCurrentSpecId = currentSpecId || sidebarState.activeSpecId || '';
  const persistedScrollTop = sidebarState.scrollTop;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Update CSS variable for page width calculations and persist to localStorage
  React.useEffect(() => {
    document.documentElement.style.setProperty(
      '--specs-nav-sidebar-width',
      isCollapsed ? '0px' : '280px'
    );
    localStorage.setItem('specs-nav-sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [resolvedCurrentSpecId, currentSubSpec]);

  React.useLayoutEffect(() => {
    if (!scrollContainerRef.current) return;
    if (Math.abs(scrollContainerRef.current.scrollTop - persistedScrollTop) > 1) {
      scrollContainerRef.current.scrollTop = persistedScrollTop;
    }
  }, [persistedScrollTop]);

  // Expose function for mobile toggle
  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.toggleSpecsSidebar = () => setMobileOpen(prev => !prev);
    return () => {
      window.toggleSpecsSidebar = undefined;
    };
  }, []);

  // Scroll active item into view only if it's not visible
  React.useEffect(() => {
    if (activeItemRef.current) {
      const element = activeItemRef.current;
      const parent = element.closest('.overflow-y-auto');

      if (parent) {
        const elementRect = element.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();

        // Check if element is already visible
        const isVisible =
          elementRect.top >= parentRect.top &&
          elementRect.bottom <= parentRect.bottom;

        // Only scroll if not visible
        if (!isVisible) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }
    }
  }, [currentSpecId, currentSubSpec]);

  const filteredSpecs = React.useMemo(() => {
    let specs = cachedSpecs;

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      specs = specs.filter(
        (spec) =>
          spec.title?.toLowerCase().includes(query) ||
          spec.specName.toLowerCase().includes(query) ||
          spec.specNumber?.toString().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      specs = specs.filter((spec) => spec.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      specs = specs.filter((spec) => spec.priority === priorityFilter);
    }

    // Apply tag filter
    if (tagFilter !== 'all') {
      specs = specs.filter((spec) => spec.tags?.includes(tagFilter));
    }

    return specs;
  }, [cachedSpecs, searchQuery, statusFilter, priorityFilter, tagFilter]);

  // Get all unique tags from all specs
  const allTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    cachedSpecs.forEach((spec) => {
      spec.tags?.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [cachedSpecs]);

  // Check if any filters are active
  const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all' || tagFilter !== 'all';

  // Reset all filters
  const resetFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setTagFilter('all');
  };

  // Sort specs by number descending (newest first)
  const sortedSpecs = React.useMemo(() => {
    return [...filteredSpecs].sort((a, b) => (b.specNumber || 0) - (a.specNumber || 0));
  }, [filteredSpecs]);

  const handleScroll = React.useCallback(() => {
    if (scrollFrameRef.current) {
      return;
    }
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      if (scrollContainerRef.current) {
        updateSidebarScrollTop(scrollContainerRef.current.scrollTop);
      }
    });
  }, []);

  // Virtual list row renderer (rowProps will be passed by react-window)
  const RowComponent = React.useCallback((rowProps: { index: number; style: React.CSSProperties }) => {
    const { index, style } = rowProps;
    const spec = sortedSpecs[index];
    const isCurrentSpec = spec.id === resolvedCurrentSpecId;

    // Extract H1 title, fallback to title or name
    const h1Title = spec.contentMd ? extractH1Title(spec.contentMd) : null;
    const displayTitle = h1Title || spec.title || spec.specName;

    return (
      <div style={style} className="px-1">
        <div className="mb-0.5">
          {/* Main spec item */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  ref={isCurrentSpec && !currentSubSpec ? activeItemRef : null}
                  href={`/specs/${spec.specNumber || spec.id}`}
                  onMouseEnter={() => onSpecHover?.(spec.specNumber?.toString() || spec.id)}
                  className={cn(
                    'w-full flex flex-col gap-1 p-1.5 rounded-md text-sm transition-colors',
                    isCurrentSpec
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'hover:bg-accent/50',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {spec.specNumber && (
                      <span className="text-xs font-mono text-muted-foreground shrink-0">
                        #{spec.specNumber.toString().padStart(3, '0')}
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
                          {getStatusLabel(spec.status)}
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
                          {getPriorityLabel(spec.priority)}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {spec.updatedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(spec.updatedAt)}
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
      </div>
    );
  }, [sortedSpecs, resolvedCurrentSpecId, currentSubSpec, onSpecHover]);

  // Calculate list height
  const listHeight = React.useMemo(() => {
    // Get viewport height minus header (3.5rem = 56px) and search/filter area (~180px)
    if (typeof window !== 'undefined') {
      return window.innerHeight - 56 - 180;
    }
    return 600; // fallback
  }, []);

  // Find the index of the current spec for scrolling
  const currentSpecIndex = React.useMemo(() => {
    return sortedSpecs.findIndex(spec => spec.id === resolvedCurrentSpecId);
  }, [sortedSpecs, resolvedCurrentSpecId]);

  const listRef = React.useRef<ListImperativeAPI>(null);

  // Scroll to current spec in virtual list
  React.useEffect(() => {
    if (listRef.current && currentSpecIndex >= 0) {
      listRef.current.scrollToRow({
        index: currentSpecIndex,
        align: 'center',
        behavior: 'smooth'
      });
    }
  }, [currentSpecIndex]);

  return (
    <TooltipProvider delayDuration={700}>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="relative flex-shrink-0">
        <aside className={cn(
          "sticky top-14 h-[calc(100vh-3.5rem)] border-r border-border bg-background flex flex-col overflow-hidden transition-all duration-300",
          // Desktop behavior
          "hidden lg:flex",
          mounted && isCollapsed ? "lg:w-0 lg:border-r-0" : "lg:w-[280px]",
          // Mobile behavior - show as overlay when open
          mobileOpen && "fixed left-0 top-14 z-50 flex w-[280px]"
        )}>
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Specifications</h2>
              <div className="flex items-center gap-1">
                {/* Filter toggle button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showFilters || hasActiveFilters ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="h-6 w-6 p-0"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {showFilters ? 'Hide filters' : 'Show filters'}
                  </TooltipContent>
                </Tooltip>
                {/* Mobile close button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileOpen(false)}
                  className="h-6 w-6 p-0 lg:hidden"
                >
                  <X className="h-4 w-4" />
                </Button>
                {/* Desktop collapse button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed(true)}
                  className="h-6 w-6 p-0 hidden lg:flex lg:items-center lg:justify-center"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Filter controls */}
            {showFilters && (
              <div className="space-y-2 mb-3 pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Filters</span>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="h-5 text-xs px-2 py-0"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>

                {allTags.length > 0 && (
                  <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tags</SelectItem>
                      {allTags.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search specs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 border-border"
              />
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden"
            onScroll={handleScroll}
          >
            {sortedSpecs.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No specs found
              </div>
            ) : (
              <List<Record<string, never>>
                listRef={listRef}
                defaultHeight={listHeight}
                rowCount={sortedSpecs.length}
                rowHeight={72}
                overscanCount={5}
                rowComponent={RowComponent}
                rowProps={{}}
              />
            )}
          </div>
        </aside>

        {/* Floating toggle button when collapsed (desktop only) */}
        {mounted && isCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(false)}
            className="hidden lg:items-center lg:justify-center lg:flex h-6 w-6 p-0 fixed z-50 top-20 -translate-y-1 -translate-x-1/2 left-[calc(var(--main-sidebar-width,240px))] bg-background border"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* Mobile floating toggle button - matches BackToTop/TOC style */}
        <Button
          onClick={() => setMobileOpen(true)}
          size="icon"
          className="lg:hidden fixed bottom-6 left-6 h-12 w-12 rounded-full shadow-lg z-40 hover:scale-110 transition-transform"
          aria-label="Show specifications list"
        >
          <ListIconLucide className="h-5 w-5" />
        </Button>
      </div>
    </TooltipProvider>
  );
}
