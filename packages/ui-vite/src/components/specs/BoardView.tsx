import { useState, useMemo, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { Clock, PlayCircle, CheckCircle2, Archive, MoreHorizontal } from 'lucide-react';
import type { Spec } from '../../lib/api';
import { PriorityBadge } from '../PriorityBadge';
import { cn } from '../../lib/utils';

type SpecStatus = 'planned' | 'in-progress' | 'complete' | 'archived';

interface BoardViewProps {
  specs: Spec[];
  onStatusChange: (spec: Spec, status: SpecStatus) => void;
  showArchived: boolean;
  onToggleArchived: () => void;
}

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

export function BoardView({ specs, onStatusChange, showArchived, onToggleArchived }: BoardViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<SpecStatus | null>(null);

  const columns = useMemo(() => {
    const cols: SpecStatus[] = ['planned', 'in-progress', 'complete'];
    if (showArchived) {
      cols.push('archived');
    }
    return cols;
  }, [showArchived]);

  const specsByStatus = useMemo(() => {
    const grouped: Record<string, Spec[]> = {
      'planned': [],
      'in-progress': [],
      'complete': [],
      'archived': []
    };

    specs.forEach(spec => {
      if (grouped[spec.status]) {
        grouped[spec.status].push(spec);
      }
    });

    return grouped;
  }, [specs]);

  const handleDragStart = (spec: Spec, e: DragEvent<HTMLDivElement>) => {
    setDraggingId(spec.name);
    e.dataTransfer.effectAllowed = 'move';
    // Set drag image or data if needed
  };

  const handleDragOver = (status: SpecStatus, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropZone !== status) {
      setActiveDropZone(status);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Only clear if we're leaving the drop zone container, not entering a child
    // This is tricky with native DnD, simplified for now
  };

  const handleDrop = (status: SpecStatus, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setActiveDropZone(null);

    if (draggingId) {
      const spec = specs.find(s => s.name === draggingId);
      if (spec && spec.status !== status) {
        onStatusChange(spec, status);
      }
      setDraggingId(null);
    }
  };

  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-4">
      {columns.map(status => {
        const config = STATUS_CONFIG[status];
        const statusSpecs = specsByStatus[status] || [];
        const Icon = config.icon;
        const isDropActive = activeDropZone === status;

        return (
          <div
            key={status}
            className={cn(
              "flex-shrink-0 w-80 flex flex-col rounded-lg bg-secondary/30 border border-transparent transition-colors",
              isDropActive && "bg-secondary/60 border-primary/50 ring-2 ring-primary/20"
            )}
            onDragOver={(e) => handleDragOver(status, e)}
            onDrop={(e) => handleDrop(status, e)}
          >
            {/* Column Header */}
            <div className={cn(
              "p-3 flex items-center justify-between border-b",
              config.borderClass,
              config.bgClass,
              "rounded-t-lg"
            )}>
              <div className="flex items-center gap-2">
                <Icon className={cn("w-4 h-4", config.colorClass)} />
                <span className={cn("font-medium text-sm", config.colorClass)}>
                  {config.title}
                </span>
                <span className="text-xs px-2 py-0.5 bg-background/50 rounded-full text-muted-foreground">
                  {statusSpecs.length}
                </span>
              </div>
              {status === 'archived' && (
                <button
                  onClick={onToggleArchived}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Column Content */}
            <div className="flex-1 p-2 overflow-y-auto min-h-[150px]">
              <div className="space-y-2">
                {statusSpecs.map(spec => (
                  <div
                    key={spec.name}
                    draggable
                    onDragStart={(e) => handleDragStart(spec, e)}
                    className={cn(
                      "bg-background p-3 rounded border shadow-sm cursor-move hover:border-primary/50 transition-all",
                      draggingId === spec.name && "opacity-50"
                    )}
                  >
                    <Link to={`/specs/${spec.name}`} className="block group">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2">
                          {spec.title}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-muted-foreground font-mono">
                          {spec.name.split('-')[0]}
                        </div>
                        {spec.priority && (
                          <PriorityBadge priority={spec.priority} className="text-[10px] px-1.5 py-0" />
                        )}
                      </div>

                      {spec.tags && spec.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {spec.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-secondary rounded text-muted-foreground">
                              {tag}
                            </span>
                          ))}
                          {spec.tags.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{spec.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {!showArchived && (
        <button
          onClick={onToggleArchived}
          className="flex-shrink-0 w-10 flex flex-col items-center py-4 gap-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors border border-transparent"
          title="Show Archived"
        >
          <Archive className="w-4 h-4 text-muted-foreground" />
          <div className="writing-vertical-rl text-xs font-medium text-muted-foreground tracking-wider uppercase">
            Archived
          </div>
        </button>
      )}
    </div>
  );
}
