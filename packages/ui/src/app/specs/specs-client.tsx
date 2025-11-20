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
  Minimize2
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

interface SpecRelationships {
  dependsOn: string[];
  related: string[];
}

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
}

type ViewMode = 'list' | 'board';
type SortBy = 'id-desc' | 'id-asc' | 'updated-desc' | 'title-asc';

export function SpecsClient({ initialSpecs }: SpecsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

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
      const response = await fetch(`/api/specs/${encodeURIComponent(spec.specName)}/status`, {
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
    router.replace(`/specs${query}`, { scroll: false });

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('specs-view-mode', viewMode);
    }
  }, [viewMode, router]);

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
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden bg-background p-4">
      <div className={cn(
        "flex flex-col h-full mx-auto transition-all duration-300",
        isWideMode ? "w-full" : "max-w-7xl w-full"
      )}>
        {/* Unified Compact Header */}
        <div className="flex-none mb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Specifications</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredAndSortedSpecs.length} specs
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-8 px-2 lg:px-3"
                  >
                    <ListIcon className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">List</span>
                  </Button>
                  <Button
                    variant={viewMode === 'board' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('board')}
                    className="h-8 px-2 lg:px-3"
                  >
                    <LayoutGrid className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">Board</span>
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsWideMode(!isWideMode)}
                  className="h-10 w-10 text-muted-foreground hover:text-foreground"
                  title={isWideMode ? "Exit wide mode" : "Enter wide mode"}
                >
                  {isWideMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search specs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as SpecStatus | 'all')}>
                <SelectTrigger className="w-[140px] h-9">
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
                <SelectTrigger className="w-[140px] h-9">
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
                <SelectTrigger className="w-[180px] h-9">
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

        {/* Content Area */}
        <div className={cn(
          "flex-1 min-h-0",
          viewMode === 'board' ? "overflow-x-auto overflow-y-hidden" : "overflow-y-auto"
        )}>
          {viewMode === 'list' ? (
            <div className="w-full">
              <ListView specs={filteredAndSortedSpecs} />
            </div>
          ) : (
            <BoardView
              specs={filteredAndSortedSpecs}
              onStatusChange={handleStatusChange}
              pendingSpecIds={pendingSpecIds}
              showArchived={showArchivedBoard}
              onToggleArchived={() => setShowArchivedBoard(!showArchivedBoard)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ListView({ specs }: { specs: Spec[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 pb-8">
      {specs.map(spec => {
        const priorityColors = {
          'critical': 'border-l-red-500',
          'high': 'border-l-orange-500',
          'medium': 'border-l-blue-500',
          'low': 'border-l-gray-400'
        };
        const borderColor = priorityColors[spec.priority as keyof typeof priorityColors] || 'border-l-gray-300';
        const hasDependencies = spec.relationships && (spec.relationships.dependsOn.length > 0 || spec.relationships.related.length > 0);
        const hasSubSpecs = !!(spec.subSpecsCount && spec.subSpecsCount > 0);

        return (
          <Card
            key={spec.id}
            className={cn(
              "hover:shadow-lg transition-all duration-150 hover:scale-[1.01] border-l-4 cursor-pointer",
              borderColor
            )}
            onClick={() => window.location.href = `/specs/${spec.specNumber || spec.id}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link href={`/specs/${spec.specNumber || spec.id}`}>
                    <CardTitle className="text-lg font-semibold hover:text-primary transition-colors flex items-center">
                      {spec.specNumber ? (
                        <span className="font-mono text-base font-normal text-muted-foreground mr-3">
                          #{spec.specNumber.toString().padStart(3, '0')}
                        </span>
                      ) : null}
                      {spec.title || spec.specName}
                    </CardTitle>
                  </Link>
                  {spec.title && spec.title !== spec.specName && (
                    <p className="text-xs font-mono text-muted-foreground mt-1.5 truncate">{spec.specName}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {spec.status && <StatusBadge status={spec.status} />}
                  {spec.priority && <PriorityBadge priority={spec.priority} />}
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex items-center justify-between gap-4 pt-0">
              {/* Metadata (Left) */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                {(spec.updatedAt || hasSubSpecs || hasDependencies) ? (
                  <>
                    {spec.updatedAt && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Updated {formatRelativeTime(spec.updatedAt)}</span>
                      </div>
                    )}
                    {hasSubSpecs && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        <span>+{spec.subSpecsCount} files</span>
                      </div>
                    )}
                    {hasDependencies && (
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="h-3.5 w-3.5" />
                        <span>
                          {spec.relationships!.dependsOn.length > 0 && `${spec.relationships!.dependsOn.length} deps`}
                          {spec.relationships!.dependsOn.length > 0 && spec.relationships!.related.length > 0 && ', '}
                          {spec.relationships!.related.length > 0 && `${spec.relationships!.related.length} related`}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="invisible">No metadata</span> /* Keep height consistent */
                )}
              </div>

              {/* Tags (Right) */}
              {spec.tags && spec.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-end shrink-0">
                  {spec.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
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
}

function BoardView({ specs, onStatusChange, pendingSpecIds, showArchived, onToggleArchived }: BoardViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<SpecStatus | null>(null);

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
    <div className="flex gap-6 h-full pb-2">
      {columns.map(column => {
        const Icon = column.config.icon;
        const isArchivedColumn = column.status === 'archived';

        return (
          <div key={column.status} className={cn(
            "flex flex-col h-full flex-1 min-w-[280px]",
            isArchivedColumn && !showArchived && "w-14 min-w-[3.5rem] flex-none flex-shrink-0"
          )}>
            <div className={cn(
              'flex-none mb-4 rounded-lg border-2 bg-background transition-all',
              column.config.bgClass,
              column.config.borderClass,
              isArchivedColumn ? 'cursor-pointer hover:opacity-80' : '',
              isArchivedColumn && !showArchived ? 'py-6 px-2' : 'p-3'
            )}
              onClick={isArchivedColumn ? onToggleArchived : undefined}
            >
              <h2 className={cn(
                'text-lg font-semibold flex items-center gap-2',
                column.config.colorClass,
                isArchivedColumn && !showArchived && 'flex-col text-sm gap-3'
              )}>
                <Icon className="h-5 w-5" />
                {isArchivedColumn && !showArchived ? (
                  <>
                    <span className="vertical-text text-sm whitespace-nowrap">
                      {column.config.title}
                    </span>
                    <Badge variant="outline" className="text-xs">{column.specs.length}</Badge>
                  </>
                ) : (
                  <>
                    {column.config.title}
                    <Badge variant="outline" className="ml-auto">{column.specs.length}</Badge>
                  </>
                )}
              </h2>
            </div>

            {(!isArchivedColumn || showArchived) && (
              <div
                className={cn(
                  'space-y-3 flex-1 rounded-xl border border-transparent p-1 transition-colors overflow-y-auto min-h-0',
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
                        'relative hover:shadow-lg transition-all duration-150 hover:scale-[1.02] border-l-4 cursor-pointer group flex flex-col',
                        borderColor,
                        isUpdating && 'opacity-60 cursor-wait'
                      )}
                      onClick={() => window.location.href = `/specs/${spec.specNumber || spec.id}`}
                    >
                      {isUpdating && (
                        <div className="absolute inset-0 rounded-lg bg-background/80 flex items-center justify-center text-xs font-medium z-10">
                          Updating...
                        </div>
                      )}
                      <CardHeader className="p-4 pb-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-muted-foreground/70 group-hover:text-primary/60 transition-colors">
                            {spec.specNumber ? `#${spec.specNumber}` : ''}
                          </span>
                        </div>
                        <Link href={`/specs/${spec.specNumber || spec.id}`} className="block">
                          <CardTitle className="text-sm font-semibold leading-snug hover:text-primary transition-colors line-clamp-3">
                            {spec.title || spec.specName}
                          </CardTitle>
                        </Link>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 flex-1 flex flex-col justify-end">
                        <div className="flex flex-col gap-3">
                          {spec.title && spec.title !== spec.specName && (
                            <p className="text-xs font-mono text-muted-foreground truncate opacity-70">
                              {spec.specName}
                            </p>
                          )}

                          <div className="flex items-center justify-between gap-2 pt-1">
                            {spec.priority ? <PriorityBadge priority={spec.priority} /> : <div />}

                            {spec.tags && spec.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 justify-end">
                                {spec.tags.slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="outline" className="text-[10px] px-1.5 h-5 font-mono text-muted-foreground/80">
                                    {tag}
                                  </Badge>
                                ))}
                                {spec.tags.length > 2 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 h-5 font-mono text-muted-foreground/80">
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
                    <CardContent className="py-8 text-center">
                      <Icon className={cn('mx-auto h-8 w-8 mb-2', column.config.colorClass, 'opacity-50')} />
                      <p className="text-sm text-muted-foreground">Drop here to move specs</p>
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
