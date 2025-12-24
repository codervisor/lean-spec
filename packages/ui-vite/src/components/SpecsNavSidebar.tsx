import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@leanspec/ui-components';
import * as ReactWindow from 'react-window';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { api, type Spec } from '../lib/api';
import { cn } from '../lib/utils';
import { formatRelativeTime } from '../lib/date-utils';

const STORAGE_KEYS = {
  collapsed: 'specs-nav-sidebar-collapsed',
  scroll: 'specs-nav-sidebar-scroll-offset',
};

interface SpecsNavSidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function SpecsNavSidebar({ mobileOpen = false, onMobileOpenChange }: SpecsNavSidebarProps) {
  const location = useLocation();
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.collapsed) === 'true';
  });
  const [listHeight, setListHeight] = useState<number>(() => calculateListHeight(false));
  const [initialScrollOffset] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const stored = localStorage.getItem(STORAGE_KEYS.scroll);
    return stored ? parseFloat(stored) : 0;
  });

  type ListRef = ReactWindow.FixedSizeList<Spec[]>;
  type ListChildComponentProps = ReactWindow.ListChildComponentProps<Spec[]>;
  type ListOnScrollProps = ReactWindow.ListOnScrollProps;

  const { FixedSizeList } = ReactWindow;

  const listRef = useRef<ListRef | null>(null);
  const mobileOpenRef = useRef(mobileOpen);

  const activeSpecId = useMemo(() => {
    const match = location.pathname.match(/\/specs\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : '';
  }, [location.pathname]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    const handler = () => setListHeight(calculateListHeight(showFilters));
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [showFilters]);

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

    if (statusFilter !== 'all') {
      result = result.filter((spec) => spec.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      result = result.filter((spec) => spec.priority === priorityFilter);
    }

    if (tagFilter !== 'all') {
      result = result.filter((spec) => spec.tags?.includes(tagFilter));
    }

    return [...result].sort((a, b) => (b.specNumber || 0) - (a.specNumber || 0));
  }, [specs, searchQuery, statusFilter, priorityFilter, tagFilter]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    specs.forEach((spec) => spec.tags?.forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [specs]);

  const hasActiveFilters =
    statusFilter !== 'all' || priorityFilter !== 'all' || tagFilter !== 'all';

  useEffect(() => {
    if (!listRef.current || initialScrollOffset > 0) return;
    const targetIndex = filteredSpecs.findIndex((spec) => spec.name === activeSpecId);
    if (targetIndex >= 0) {
      listRef.current.scrollToItem(targetIndex, 'center');
    }
  }, [filteredSpecs, activeSpecId, initialScrollOffset]);

  const resetFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setTagFilter('all');
  };

  const Row = ({ index, style, data }: ListChildComponentProps) => {
    const spec = data[index];
    const isActive = spec.name === activeSpecId;
    const displayTitle = spec.title || spec.specName;

    return (
      <div style={style} className="px-1">
        <Link
          to={`/specs/${spec.name}`}
          onClick={() => onMobileOpenChange?.(false)}
          className={cn(
            'flex flex-col gap-1 p-2 rounded-md text-sm transition-colors',
            isActive
              ? 'bg-accent text-accent-foreground font-medium'
              : 'hover:bg-accent/50'
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {spec.specNumber && (
              <span className="text-xs font-mono text-muted-foreground shrink-0">
                #{spec.specNumber.toString().padStart(3, '0')}
              </span>
            )}
            <span className="truncate text-xs leading-relaxed">{displayTitle}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {spec.status && (
              <StatusBadge status={spec.status} className="text-[10px] px-1.5 py-0 h-4" />
            )}
            {spec.priority && (
              <PriorityBadge priority={spec.priority} className="text-[10px] px-1.5 py-0 h-4" />
            )}
            {spec.updatedAt && (
              <span className="text-[10px] text-muted-foreground">
                {formatRelativeTime(spec.updatedAt)}
              </span>
            )}
          </div>
        </Link>
      </div>
    );
  };

  const sidebarVisible = mobileOpen || !collapsed;

  return (
    <div className="relative">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => onMobileOpenChange?.(false)}
        />
      )}

      <aside
        className={cn(
          'border-r bg-background flex flex-col overflow-hidden transition-all duration-300',
          mobileOpen
            ? 'fixed inset-y-0 left-0 z-50 w-[280px] shadow-xl'
            : 'hidden lg:flex lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]',
          collapsed && !mobileOpen ? 'lg:w-0 lg:border-r-0' : 'lg:w-[280px]'
        )}
      >
        <div className="p-3 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Specifications</h2>
            <div className="flex items-center gap-1">
              <Button
                variant={showFilters || hasActiveFilters ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setShowFilters((prev) => !prev)}
                title="Toggle filters"
              >
                <Filter className="h-4 w-4" />
              </Button>
              {onMobileOpenChange && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 lg:hidden"
                  onClick={() => onMobileOpenChange(false)}
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hidden lg:flex"
                onClick={() => setCollapsed(true)}
                title="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search specs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          {showFilters && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Filters</span>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={resetFilters}
                  >
                    Clear
                  </Button>
                )}
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in-progress">In progress</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              {allTags.length > 0 && (
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tags</SelectItem>
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
        </div>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Loading...
            </div>
          ) : filteredSpecs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No specs found
            </div>
          ) : (
            <FixedSizeList
              ref={listRef}
              height={listHeight}
              width="100%"
              itemSize={76}
              itemCount={filteredSpecs.length}
              itemData={filteredSpecs}
              overscanCount={6}
              initialScrollOffset={initialScrollOffset}
              onScroll={({ scrollOffset }: ListOnScrollProps) =>
                localStorage.setItem(STORAGE_KEYS.scroll, String(scrollOffset))
              }
            >
              {Row}
            </FixedSizeList>
          )}
        </div>
      </aside>

      {!sidebarVisible && (
        <Button
          variant="ghost"
          size="sm"
          className="hidden lg:flex h-6 w-6 p-0 fixed z-20 top-20 -translate-x-1/2 left-[calc(var(--main-sidebar-width,240px))] bg-background border"
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function calculateListHeight(filtersOpen: boolean) {
  if (typeof window === 'undefined') return 600;
  const headerHeight = 56; // top navigation bar
  const controlsHeight = filtersOpen ? 250 : 170; // search + filters container
  return Math.max(window.innerHeight - headerHeight - controlsHeight, 320);
}
