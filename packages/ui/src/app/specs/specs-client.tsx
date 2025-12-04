'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { DragEvent } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Search,
  CheckCircle2,
  PlayCircle,
  Clock,
  Archive,
  LayoutGrid,
  List as ListIcon,
  FileText,
  GitBranch,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { PriorityBadge } from '@/components/priority-badge';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/date-utils';
import { toast } from '@/components/ui/toast';

type SpecStatus = 'planned' | 'in-progress' | 'complete' | 'archived';

const STATUS_CONFIG: Record<SpecStatus, {
  icon: typeof Clock;
  title: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}> = {
  'planned': {
    icon: Clock,
    title: 'Planned',
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    borderClass: 'border-blue-200 dark:border-blue-800'
  },
  'in-progress': {
    icon: PlayCircle,
    title: 'In Progress',
    colorClass: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-50 dark:bg-orange-900/20',
    borderClass: 'border-orange-200 dark:border-orange-800'
  },
  'complete': {
    icon: CheckCircle2,
    title: 'Complete',
    colorClass: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-50 dark:bg-green-900/20',
    borderClass: 'border-green-200 dark:border-green-800'
  },
  'archived': {
    icon: Archive,
    title: 'Archived',
    colorClass: 'text-gray-600 dark:text-gray-400',
    bgClass: 'bg-gray-50 dark:bg-gray-900/20',
    borderClass: 'border-gray-200 dark:border-gray-800'
  }
};

const BOARD_STATUSES: SpecStatus[] = ['planned', 'in-progress', 'complete', 'archived'];

import type { SpecRelationships } from '@/types/specs';

interface Spec {
  id: string;
  specNumber: number | null;
  specName: string;
  title: string | null;
  status: SpecStatus | null;
  priority: string | null;
  tags: string[] | null;
  updatedAt: Date | null;
  subSpecsCount?: number;
  relationships?: SpecRelationships;
}

interface Stats {
  totalSpecs: number;
  completionRate: number;
  specsByStatus: { status: string; count: number }[];
}

interface SpecsClientProps {
  initialSpecs: Spec[];
  initialStats: Stats;
  projectId?: string;
}

type ViewMode = 'list' | 'board';
type SortBy = 'id-desc' | 'id-asc' | 'updated-desc' | 'title-asc';

export function SpecsClient({ initialSpecs, projectId }: SpecsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Helper to generate project-scoped URLs
  const getSpecUrl = useCallback((specId: string | number) => {
    return projectId 
      ? `/projects/${projectId}/specs/${specId}`
      : `/specs/${specId}`;
  }, [projectId]);

  const getSpecsBaseUrl = useCallback(() => {
    return projectId ? `/projects/${projectId}/specs` : '/specs';
  }, [projectId]);

  const [specs, setSpecs] = useState<Spec[]>(initialSpecs);
  const [pendingSpecIds, setPendingSpecIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SpecStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('id-desc');
  const [showArchivedBoard, setShowArchivedBoard] = useState(false); // Start collapsed
  const [isWideMode, setIsWideMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Initialize from URL or localStorage
    const urlView = searchParams.get('view');
    if (urlView === 'board' || urlView === 'list') return urlView;

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('specs-view-mode');
      if (stored === 'board' || stored === 'list') return stored;
    }
    return 'list';
  });

  const isFirstRender = useRef(true);

  useEffect(() => {
    setSpecs(initialSpecs);
  }, [initialSpecs]);

  const handleStatusChange = useCallback(async (spec: Spec, nextStatus: SpecStatus) => {
    if (spec.status === nextStatus) {
      return;
    }

    const previousStatus = spec.status;
    setPendingSpecIds((prev) => ({ ...prev, [spec.id]: true }));
    setSpecs((prev) => prev.map(item => item.id === spec.id ? { ...item, status: nextStatus } : item));

    try {
      const url = projectId 
        ? `/api/projects/${projectId}/specs/${encodeURIComponent(spec.specName)}/status`
        : `/api/specs/${encodeURIComponent(spec.specName)}/status`;

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to update spec status');
      }

      const displayName = spec.specNumber ? `#${spec.specNumber}` : spec.specName;
      toast.success(`Moved ${displayName} to ${STATUS_CONFIG[nextStatus].title}`);
    } catch (error) {
      console.error('Failed to update spec status', error);
      setSpecs((prev) => prev.map(item => item.id === spec.id ? { ...item, status: previousStatus } : item));
      toast.error('Unable to update status. Please try again.');
    } finally {
      setPendingSpecIds((prev) => {
        const next = { ...prev };
        delete next[spec.id];
        return next;
      });
    }
  }, []);

  // Auto-show archived column when filtering by archived status in board view
  useEffect(() => {
    if (statusFilter === 'archived' && viewMode === 'board') {
      setShowArchivedBoard(true);
    }
  }, [statusFilter, viewMode]);

  // Update URL when view mode changes (skip on initial mount)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const current = new URLSearchParams(window.location.search);
    if (viewMode === 'board') {
      current.set('view', 'board');
    } else {
      current.delete('view');
    }
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.replace(`${getSpecsBaseUrl()}${query}`, { scroll: false });

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('specs-view-mode', viewMode);
    }
  }, [viewMode, router, getSpecsBaseUrl]);

  const filteredAndSortedSpecs = useMemo(() => {
    const filtered = specs.filter(spec => {
      const matchesSearch = !searchQuery ||
        spec.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spec.specName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spec.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all'
        ? (viewMode === 'list' ? spec.status !== 'archived' : true)
        : spec.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || spec.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    const sorted = [...filtered];

    // Sort
    switch (sortBy) {
      case 'id-desc':
        sorted.sort((a, b) => (b.specNumber || 0) - (a.specNumber || 0));
        break;
      case 'id-asc':
        sorted.sort((a, b) => (a.specNumber || 0) - (b.specNumber || 0));
        break;
      case 'updated-desc':
        sorted.sort((a, b) => {
          if (!a.updatedAt) return 1;
          if (!b.updatedAt) return -1;
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        });
        break;
      case 'title-asc':
        sorted.sort((a, b) => {
          const titleA = (a.title || a.specName).toLowerCase();
          const titleB = (b.title || b.specName).toLowerCase();
          return titleA.localeCompare(titleB);
        });
        break;
    }
    return sorted;
  }, [specs, searchQuery, statusFilter, priorityFilter, sortBy, viewMode]);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden bg-background p-2 sm:p-4">
      <div className={cn(
        "flex flex-col h-full mx-auto transition-all duration-300",
        isWideMode ? "w-full" : "max-w-7xl w-full"
      )}>
        {/* Unified Compact Header */}
        <div className="flex-none mb-3 sm:mb-4">
          <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
            {/* Title and Controls Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight truncate">Specifications</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {filteredAndSortedSpecs.length} specs
                </p>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <div className="flex items-center gap-0.5 sm:gap-1 bg-muted/50 p-0.5 sm:p-1 rounded-lg">
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-7 sm:h-8 px-2 sm:px-3"
                    title="List view"
                  >
                    <ListIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden lg:inline ml-2">List</span>
                  </Button>
                  <Button
                    variant={viewMode === 'board' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('board')}
                    className="h-7 sm:h-8 px-2 sm:px-3"
                    title="Board view"
                  >
                    <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden lg:inline ml-2">Board</span>
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsWideMode(!isWideMode)}
                  className="hidden md:flex h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground"
                  title={isWideMode ? "Exit wide mode" : "Enter wide mode"}
                >
                  {isWideMode ? <Minimize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                </Button>
              </div>
            </div>

            {/* Search and Filters Row */}
            <div className="flex flex-col gap-2">
              {/* Search Bar - Full width on mobile */}
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search specs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 sm:pl-9 h-9 sm:h-10 w-full text-sm"
                />
              </div>

              {/* Filters - Horizontal scroll on mobile with snap points */}
              <div className="flex items-center gap-2 overflow-x-auto snap-x snap-mandatory pb-1 -mx-2 px-2 sm:mx-0 sm:px-0 sm:pb-0 scrollbar-thin">
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as SpecStatus | 'all')}>
                  <SelectTrigger className="w-[110px] sm:w-[130px] h-9 sm:h-10 flex-shrink-0 snap-start text-xs sm:text-sm">
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
                  <SelectTrigger className="w-[110px] sm:w-[130px] h-9 sm:h-10 flex-shrink-0 snap-start text-xs sm:text-sm">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                  <SelectTrigger className="w-[130px] sm:w-[170px] h-9 sm:h-10 flex-shrink-0 snap-start text-xs sm:text-sm">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id-desc">Newest First</SelectItem>
                    <SelectItem value="id-asc">Oldest First</SelectItem>
                    <SelectItem value="updated-desc">Recently Updated</SelectItem>
                    <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className={cn(
          "flex-1 min-h-0",
          viewMode === 'board' ? "overflow-x-auto overflow-y-hidden" : "overflow-y-auto"
        )}>
          {viewMode === 'list' ? (
            <div className="w-full">
              <ListView specs={filteredAndSortedSpecs} getSpecUrl={getSpecUrl} />
            </div>
          ) : (
            <BoardView
              specs={filteredAndSortedSpecs}
              onStatusChange={handleStatusChange}
              pendingSpecIds={pendingSpecIds}
              showArchived={showArchivedBoard}
              onToggleArchived={() => setShowArchivedBoard(!showArchivedBoard)}
              getSpecUrl={getSpecUrl}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ListView({ specs, getSpecUrl }: { specs: Spec[]; getSpecUrl: (specId: string | number) => string }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:gap-3 md:gap-4 pb-2 sm:pb-4 md:pb-8">
      {specs.map(spec => {
        const priorityColors = {
          'critical': 'border-l-red-500',
          'high': 'border-l-orange-500',
          'medium': 'border-l-blue-500',
          'low': 'border-l-gray-400'
        };
        const borderColor = priorityColors[spec.priority as keyof typeof priorityColors] || 'border-l-gray-300';
        const hasDependencies = spec.relationships && spec.relationships.dependsOn.length > 0;
        const hasSubSpecs = !!(spec.subSpecsCount && spec.subSpecsCount > 0);
        const specUrl = getSpecUrl(spec.specNumber || spec.id);

        return (
          <Card
            key={spec.id}
            className={cn(
              "hover:shadow-lg active:shadow-xl transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] border-l-4 cursor-pointer touch-manipulation",
              borderColor
            )}
            onClick={() => window.location.href = specUrl}
          >
            {/* Mobile-optimized layout */}
            <CardHeader className="pb-2 sm:pb-2.5 md:pb-3 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-4">
                <div className="flex-1 min-w-0">
                  <Link href={specUrl}>
                    <CardTitle className="text-sm sm:text-base md:text-lg font-semibold hover:text-primary transition-colors flex items-start flex-wrap gap-1.5 sm:gap-2 leading-snug sm:leading-normal">
                      {spec.specNumber ? (
                        <span className="font-mono text-xs sm:text-sm md:text-base font-normal text-muted-foreground flex-shrink-0">
                          #{spec.specNumber.toString().padStart(3, '0')}
                        </span>
                      ) : null}
                      <span className="flex-1 break-words">{spec.title || spec.specName}</span>
                    </CardTitle>
                  </Link>
                  {spec.title && spec.title !== spec.specName && (
                    <p className="text-[11px] sm:text-xs font-mono text-muted-foreground mt-1 sm:mt-1.5 truncate">{spec.specName}</p>
                  )}
                </div>
                {/* Badges: responsive layout */}
                <div className="flex gap-1.5 sm:gap-2 flex-wrap md:shrink-0">
                  {spec.status && <StatusBadge status={spec.status} />}
                  {spec.priority && <PriorityBadge priority={spec.priority} />}
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-3 sm:px-4 md:px-6 pb-2.5 sm:pb-3 md:pb-6 pt-0">
              {/* Metadata and Tags - Stack on mobile */}
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
                {/* Metadata (Left) */}
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4 text-[11px] sm:text-xs md:text-sm text-muted-foreground flex-wrap">
                  {(spec.updatedAt || hasSubSpecs || hasDependencies) ? (
                    <>
                      {spec.updatedAt && (
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                          <span className="whitespace-nowrap">Updated {formatRelativeTime(spec.updatedAt)}</span>
                        </div>
                      )}
                      {hasSubSpecs && (
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                          <span className="whitespace-nowrap">+{spec.subSpecsCount} files</span>
                        </div>
                      )}
                      {hasDependencies && (
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <GitBranch className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                          <span className="whitespace-nowrap">
                            {spec.relationships!.dependsOn.length} deps
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="invisible hidden md:inline">No metadata</span> /* Keep height consistent on desktop */
                  )}
                </div>

                {/* Tags (Right on desktop, below on mobile) */}
                {spec.tags && spec.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2 md:justify-end md:shrink-0">
                    {spec.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-[10px] sm:text-xs font-mono text-muted-foreground hover:text-foreground transition-colors h-5 sm:h-auto px-1.5 sm:px-2">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface BoardViewProps {
  specs: Spec[];
  onStatusChange: (spec: Spec, status: SpecStatus) => void;
  pendingSpecIds: Record<string, boolean>;
  showArchived: boolean;
  onToggleArchived: () => void;
  getSpecUrl: (specId: string | number) => string;
}

function BoardView({ specs, onStatusChange, pendingSpecIds, showArchived, onToggleArchived, getSpecUrl }: BoardViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<SpecStatus | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});

  const toggleColumn = (status: string) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  const columns = useMemo(() => {
    // Always show all columns, including archived (it will be rendered as collapsed bar when showArchived=false)
    return BOARD_STATUSES.map(status => ({
      status,
      config: STATUS_CONFIG[status],
      specs: specs.filter(spec => spec.status === status),
    }));
  }, [specs]);

  const specLookup = useMemo(() => {
    const map = new Map<string, Spec>();
    specs.forEach(spec => map.set(spec.id, spec));
    return map;
  }, [specs]);

  const handleDragStart = useCallback((specId: string, event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('text/plain', specId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingId(specId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setActiveDropZone(null);
  }, []);

  const handleDragOver = useCallback((status: SpecStatus, event: DragEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setActiveDropZone(status);
  }, [draggingId]);

  const handleDragLeave = useCallback((status: SpecStatus, event: DragEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    const related = event.relatedTarget as Node | null;
    if (!related || !event.currentTarget.contains(related)) {
      setActiveDropZone((current) => (current === status ? null : current));
    }
  }, [draggingId]);

  const handleDrop = useCallback((status: SpecStatus, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData('text/plain') || draggingId;
    if (!draggedId) {
      handleDragEnd();
      return;
    }

    const spec = specLookup.get(draggedId);
    if (spec && spec.status !== status) {
      onStatusChange(spec, status);
    }

    handleDragEnd();
  }, [draggingId, handleDragEnd, onStatusChange, specLookup]);

  return (
    <div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6 h-full pb-2 md:snap-x md:snap-mandatory overflow-y-auto md:overflow-y-hidden md:overflow-x-auto">
      {columns.map(column => {
        const Icon = column.config.icon;
        const isArchivedColumn = column.status === 'archived';
        const isCollapsed = collapsedColumns[column.status];

        return (
          <div key={column.status} className={cn(
            "flex flex-col flex-1 snap-start",
            "h-auto md:h-full w-full md:w-auto flex-shrink-0",
            isArchivedColumn && !showArchived ? "md:w-12 md:sm:w-14 md:min-w-[3rem] md:sm:min-w-[3.5rem] flex-none" : "md:min-w-[260px] md:sm:min-w-[280px] md:md:min-w-[300px]"
          )}>
            <div className={cn(
              'flex-none mb-3 sm:mb-4 rounded-lg border-2 bg-background transition-all touch-manipulation',
              column.config.bgClass,
              column.config.borderClass,
              isArchivedColumn ? 'cursor-pointer hover:opacity-80 active:opacity-70' : '',
              isArchivedColumn && !showArchived ? 'py-4 sm:py-6 px-1.5 sm:px-2' : 'p-2.5 sm:p-3',
              // Mobile collapsible header styling
              'md:cursor-default cursor-pointer'
            )}
              onClick={() => {
                if (isArchivedColumn) {
                  onToggleArchived();
                } else {
                  // Only toggle collapse on mobile
                  if (window.innerWidth < 768) {
                    toggleColumn(column.status);
                  }
                }
              }}
            >
              <h2 className={cn(
                'text-base sm:text-lg font-semibold flex items-center gap-1.5 sm:gap-2',
                column.config.colorClass,
                isArchivedColumn && !showArchived && 'flex-col text-xs sm:text-sm gap-2 sm:gap-3'
              )}>
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                {isArchivedColumn && !showArchived ? (
                  <>
                    <span className="vertical-text text-xs sm:text-sm whitespace-nowrap">
                      {column.config.title}
                    </span>
                    <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-2 h-4 sm:h-5">{column.specs.length}</Badge>
                  </>
                ) : (
                  <>
                    <span className="truncate flex-1">{column.config.title}</span>
                    <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 h-4 sm:h-5 flex-shrink-0">{column.specs.length}</Badge>
                    {/* Mobile collapse indicator */}
                    <div className="md:hidden ml-2 text-muted-foreground/50">
                      {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </>
                )}
              </h2>
            </div>

            {(!isArchivedColumn || showArchived) && !isCollapsed && (
              <div
                className={cn(
                  'space-y-2 sm:space-y-2.5 md:space-y-3 flex-1 rounded-xl border border-transparent p-1 transition-colors overflow-y-auto min-h-0 scrollbar-thin',
                  draggingId && 'border-dashed border-muted-foreground/40',
                  draggingId && activeDropZone === column.status && 'bg-muted/40 border-primary/50'
                )}
                onDragOver={(event) => handleDragOver(column.status, event)}
                onDragLeave={(event) => handleDragLeave(column.status, event)}
                onDrop={(event) => handleDrop(column.status, event)}
              >
                {column.specs.map(spec => {
                  const priorityColors = {
                    'critical': 'border-l-red-500',
                    'high': 'border-l-orange-500',
                    'medium': 'border-l-blue-500',
                    'low': 'border-l-gray-400'
                  };
                  const borderColor = priorityColors[spec.priority as keyof typeof priorityColors] || 'border-l-gray-300';
                  const isUpdating = Boolean(pendingSpecIds[spec.id]);
                  const specUrl = getSpecUrl(spec.specNumber || spec.id);

                  return (
                    <Card
                      key={spec.id}
                      draggable={!isUpdating}
                      onDragStart={(event) => {
                        if (isUpdating) {
                          event.preventDefault();
                          return;
                        }
                        handleDragStart(spec.id, event);
                      }}
                      onDragEnd={handleDragEnd}
                      aria-disabled={isUpdating}
                      className={cn(
                        'relative hover:shadow-lg active:shadow-xl transition-all duration-150 hover:scale-[1.02] active:scale-[0.99] border-l-4 cursor-pointer group flex flex-col touch-manipulation',
                        borderColor,
                        isUpdating && 'opacity-60 cursor-wait'
                      )}
                      onClick={() => window.location.href = specUrl}
                    >
                      {isUpdating && (
                        <div className="absolute inset-0 rounded-lg bg-background/80 flex items-center justify-center text-xs sm:text-sm font-medium z-10">
                          Updating...
                        </div>
                      )}
                      <CardHeader className="p-3 sm:p-4 pb-1.5 sm:pb-2 space-y-1 sm:space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] sm:text-xs text-muted-foreground/70 group-hover:text-primary/60 transition-colors">
                            {spec.specNumber ? `#${spec.specNumber}` : ''}
                          </span>
                        </div>
                        <Link href={specUrl} className="block">
                          <CardTitle className="text-xs sm:text-sm font-semibold leading-snug hover:text-primary transition-colors line-clamp-3">
                            {spec.title || spec.specName}
                          </CardTitle>
                        </Link>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-4 pt-1.5 sm:pt-2 flex-1 flex flex-col justify-end">
                        <div className="flex flex-col gap-2 sm:gap-3">
                          {spec.title && spec.title !== spec.specName && (
                            <p className="text-[10px] sm:text-xs font-mono text-muted-foreground truncate opacity-70">
                              {spec.specName}
                            </p>
                          )}

                          <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-0.5 sm:pt-1">
                            {spec.priority ? <PriorityBadge priority={spec.priority} /> : <div />}

                            {spec.tags && spec.tags.length > 0 && (
                              <div className="flex flex-wrap gap-0.5 sm:gap-1 justify-end">
                                {spec.tags.slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 h-4 sm:h-5 font-mono text-muted-foreground/80">
                                    {tag}
                                  </Badge>
                                ))}
                                {spec.tags.length > 2 && (
                                  <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 h-4 sm:h-5 font-mono text-muted-foreground/80">
                                    +{spec.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {column.specs.length === 0 && (
                  <Card className="border-dashed border-gray-300 dark:border-gray-700 bg-transparent">
                    <CardContent className="py-6 sm:py-8 text-center px-2">
                      <Icon className={cn('mx-auto h-6 w-6 sm:h-8 sm:w-8 mb-1.5 sm:mb-2', column.config.colorClass, 'opacity-50')} />
                      <p className="text-xs sm:text-sm text-muted-foreground">Drop here to move specs</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
