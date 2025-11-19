'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { PriorityBadge } from '@/components/priority-badge';
interface BoardViewProps {
  specs: Spec[];
  onStatusChange: (spec: Spec, status: SpecStatus) => void;
  pendingSpecIds: Record<string, boolean>;
}

function BoardView({ specs, onStatusChange, pendingSpecIds }: BoardViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<SpecStatus | null>(null);

  const columns = useMemo(() => {
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

  const handleDragStart = useCallback((specId: string, event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('text/plain', specId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingId(specId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setActiveDropZone(null);
  }, []);

  const handleDragOver = useCallback((status: SpecStatus, event: React.DragEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setActiveDropZone(status);
  }, [draggingId]);

  const handleDragLeave = useCallback((status: SpecStatus, event: React.DragEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    const related = event.relatedTarget as Node | null;
    if (!related || !event.currentTarget.contains(related)) {
      setActiveDropZone((current) => (current === status ? null : current));
    }
  }, [draggingId]);

  const handleDrop = useCallback((status: SpecStatus, event: React.DragEvent<HTMLDivElement>) => {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {columns.map(column => {
        const Icon = column.config.icon;
        return (
          <div key={column.status} className="flex flex-col">
            <div className={cn(
              'sticky top-14 z-40 mb-4 p-3 rounded-lg border-2 bg-background',
              column.config.bgClass,
              column.config.borderClass
            )}>
              <h2 className={cn(
                'text-lg font-semibold flex items-center gap-2',
                column.config.colorClass
              )}>
                <Icon className="h-5 w-5" />
                {column.config.title}
                <Badge variant="outline" className="ml-auto">{column.specs.length}</Badge>
              </h2>
            </div>

            <div
              className={cn(
                'space-y-3 flex-1 rounded-xl border border-transparent p-1 transition-colors',
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
                      'relative hover:shadow-lg transition-all duration-150 hover:scale-[1.02] border-l-4 cursor-pointer',
                      borderColor,
                      isUpdating && 'opacity-60 cursor-wait'
                    )}
                    onClick={() => window.location.href = `/specs/${spec.specNumber || spec.id}`}
                  >
                    {isUpdating && (
                      <div className="absolute inset-0 rounded-lg bg-background/80 flex items-center justify-center text-xs font-medium">
                        Updating…
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <Link href={`/specs/${spec.specNumber || spec.id}`}>
                        <CardTitle className="text-sm font-medium hover:text-primary transition-colors">
                          {spec.specNumber ? `#${spec.specNumber}` : spec.specName}
                        </CardTitle>
                      </Link>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {spec.title || spec.specName}
                      </p>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {spec.priority && <PriorityBadge priority={spec.priority} />}
                        
                        {spec.tags && spec.tags.length > 0 && (
                          <>
                            {spec.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {spec.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{spec.tags.length - 2}
                              </Badge>
                            )}
                          </>
                        )}
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
          </div>
        );
      })}
    </div>
  );
}
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

      const matchesStatus = statusFilter === 'all' || spec.status === statusFilter;
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
  }, [specs, searchQuery, statusFilter, priorityFilter, sortBy]);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Specifications</h1>
          <p className="text-muted-foreground mt-2">
            {viewMode === 'board' ? 'Kanban board view (active statuses only)' : 'Browse all specifications'}
          </p>
        </div>

        {/* Filters and View Switcher */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search specs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as SpecStatus | 'all')}>
              <SelectTrigger className="w-full sm:w-[180px]">
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

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
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
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-4">
            {/* Sort Controls */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id-desc">Newest First (ID ↓)</SelectItem>
                <SelectItem value="id-asc">Oldest First (ID ↑)</SelectItem>
                <SelectItem value="updated-desc">Recently Updated</SelectItem>
                <SelectItem value="title-asc">Title (A-Z)</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Switcher */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="flex items-center gap-2"
              >
                <ListIcon className="h-4 w-4" />
                List
              </Button>
              <Button
                variant={viewMode === 'board' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('board')}
                className="flex items-center gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                Board
              </Button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground mb-4">
          Showing {filteredAndSortedSpecs.length} of {specs.length} specs
        </div>

        {/* Content based on view mode */}
        {viewMode === 'list' ? (
          <ListView specs={filteredAndSortedSpecs} />
        ) : (
          <BoardView specs={filteredAndSortedSpecs} />
        )}
      </div>
    </div>
  );
}

function ListView({ specs }: { specs: Spec[] }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {specs.map(spec => {
        const priorityColors = {
          'critical': 'border-l-red-500',
          'high': 'border-l-orange-500',
          'medium': 'border-l-blue-500',
          'low': 'border-l-gray-400'
        };
        const borderColor = priorityColors[spec.priority as keyof typeof priorityColors] || 'border-l-gray-300';

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
                    <CardTitle className="text-lg font-semibold hover:text-primary transition-colors">
                      {spec.specNumber ? `#${spec.specNumber.toString().padStart(3, '0')}` : spec.specName}
                      {' '}
                      {spec.title || spec.specName}
                    </CardTitle>
                  </Link>
                </div>
                <div className="flex gap-2 shrink-0">
                  {spec.status && <StatusBadge status={spec.status} />}
                  {spec.priority && <PriorityBadge priority={spec.priority} />}
                </div>
              </div>
            </CardHeader>
            {spec.tags && spec.tags.length > 0 && (
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {spec.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function BoardView({ specs }: { specs: Spec[] }) {
  const columns = useMemo(() => {
    const statusConfig = {
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
      }
    } as const;
    
    const statuses = ['planned', 'in-progress', 'complete'] as const;
    
    return statuses.map(status => ({
      status,
      config: statusConfig[status],
      specs: specs.filter(spec => spec.status === status),
    }));
  }, [specs]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {columns.map(column => {
        const Icon = column.config.icon;
        return (
          <div key={column.status} className="flex flex-col">
            <div className={cn(
              "sticky top-14 z-40 mb-4 p-3 rounded-lg border-2 bg-background",
              column.config.bgClass,
              column.config.borderClass
            )}>
              <h2 className={cn(
                "text-lg font-semibold flex items-center gap-2",
                column.config.colorClass
              )}>
                <Icon className="h-5 w-5" />
                {column.config.title}
                <Badge variant="outline" className="ml-auto">{column.specs.length}</Badge>
              </h2>
            </div>

            <div className="space-y-3 flex-1">
              {column.specs.map(spec => {
                const priorityColors = {
                  'critical': 'border-l-red-500',
                  'high': 'border-l-orange-500',
                  'medium': 'border-l-blue-500',
                  'low': 'border-l-gray-400'
                };
                const borderColor = priorityColors[spec.priority as keyof typeof priorityColors] || 'border-l-gray-300';

                return (
                  <Card 
                    key={spec.id} 
                    className={cn(
                      "hover:shadow-lg transition-all duration-150 hover:scale-[1.02] border-l-4 cursor-pointer",
                      borderColor
                    )}
                    onClick={() => window.location.href = `/specs/${spec.specNumber || spec.id}`}
                  >
                    <CardHeader className="pb-3">
                      <Link href={`/specs/${spec.specNumber || spec.id}`}>
                        <CardTitle className="text-sm font-medium hover:text-primary transition-colors">
                          {spec.specNumber ? `#${spec.specNumber}` : spec.specName}
                        </CardTitle>
                      </Link>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {spec.title || spec.specName}
                      </p>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {spec.priority && <PriorityBadge priority={spec.priority} />}
                        
                        {spec.tags && spec.tags.length > 0 && (
                          <>
                            {spec.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {spec.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{spec.tags.length - 2}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
