import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
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
import {
  List,
  type ListImperativeAPI,
} from 'react-window';
import { StatusBadge, getStatusLabel } from './StatusBadge';
import { PriorityBadge, getPriorityLabel } from './PriorityBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './Tooltip';
import { api, type Spec } from '../lib/api';
import { cn } from '../lib/utils';
import { formatRelativeTime } from '../lib/date-utils';
import { useTranslation } from 'react-i18next';

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
  const { projectId } = useParams<{ projectId: string }>();
  const basePath = projectId ? `/projects/${projectId}` : '/projects/default';
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
  const [listHeight, setListHeight] = useState<number>(() => calculateListHeight());
  const [initialScrollOffset] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const stored = localStorage.getItem(STORAGE_KEYS.scroll);
    return stored ? parseFloat(stored) : 0;
  });
  const { t, i18n } = useTranslation('common');

  const listRef = useRef<ListImperativeAPI>(null);
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
    specs.forEach((spec) => spec.tags?.forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [specs]);

  const hasActiveFilters =
    statusFilter !== 'all' || priorityFilter !== 'all' || tagFilter !== 'all';

  useEffect(() => {
    if (initialScrollOffset > 0) return;
    const targetIndex = filteredSpecs.findIndex((spec) => spec.specName === activeSpecId);
    if (targetIndex >= 0) {
      listRef.current?.scrollToRow({ index: targetIndex, align: 'center', behavior: 'instant' });
    }
  }, [filteredSpecs, activeSpecId, initialScrollOffset]);

  useEffect(() => {
    const el = listRef.current?.element;
    if (!el) return;

    if (initialScrollOffset > 0) {
      el.scrollTop = initialScrollOffset;
    }
  }, [initialScrollOffset, listHeight, showFilters, filteredSpecs.length]);

  useEffect(() => {
    const el = listRef.current?.element;
    if (!el) return;

    const onScroll = () => {
      localStorage.setItem(STORAGE_KEYS.scroll, String(el.scrollTop));
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const resetFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setTagFilter('all');
  };

  const sidebarVisible = mobileOpen || !collapsed;
  console.debug('sidebarVisible', sidebarVisible);

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
            'border-r bg-background flex flex-col overflow-hidden transition-all duration-300',
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

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={t('specsNavSidebar.select.status.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('specsNavSidebar.select.status.all')}</SelectItem>
                    <SelectItem value="planned">{t('status.planned')}</SelectItem>
                    <SelectItem value="in-progress">{t('status.inProgress')}</SelectItem>
                    <SelectItem value="complete">{t('status.complete')}</SelectItem>
                    <SelectItem value="archived">{t('status.archived')}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={t('specsNavSidebar.select.priority.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('specsNavSidebar.select.priority.all')}</SelectItem>
                    <SelectItem value="low">{t('priority.low')}</SelectItem>
                    <SelectItem value="medium">{t('priority.medium')}</SelectItem>
                    <SelectItem value="high">{t('priority.high')}</SelectItem>
                    <SelectItem value="critical">{t('priority.critical')}</SelectItem>
                  </SelectContent>
                </Select>

                {allTags.length > 0 && (
                  <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={t('specsNavSidebar.select.tag.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('specsNavSidebar.select.tag.all')}</SelectItem>
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
