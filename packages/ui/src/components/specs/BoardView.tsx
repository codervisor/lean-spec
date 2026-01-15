import { useState, useMemo, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { Clock, PlayCircle, CheckCircle2, Archive } from 'lucide-react';
import type { Spec } from '../../types/api';
import { PriorityBadge } from '../PriorityBadge';
import { cn } from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';

type SpecStatus = 'planned' | 'in-progress' | 'complete' | 'archived';

interface BoardViewProps {
  specs: Spec[];
  onStatusChange: (spec: Spec, status: SpecStatus) => void;
  basePath?: string;
  canEdit?: boolean;
}

const STATUS_CONFIG: Record<SpecStatus, {
  icon: typeof Clock;
  titleKey: `status.${string}`;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}> = {
  'planned': {
    icon: Clock,
    titleKey: 'status.planned',
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    borderClass: 'border-blue-200 dark:border-blue-800'
  },
  'in-progress': {
    icon: PlayCircle,
    titleKey: 'status.inProgress',
    colorClass: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-50 dark:bg-orange-900/20',
    borderClass: 'border-orange-200 dark:border-orange-800'
  },
  'complete': {
    icon: CheckCircle2,
    titleKey: 'status.complete',
    colorClass: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-50 dark:bg-green-900/20',
    borderClass: 'border-green-200 dark:border-green-800'
  },
  'archived': {
    icon: Archive,
    titleKey: 'status.archived',
    colorClass: 'text-gray-600 dark:text-gray-400',
    bgClass: 'bg-gray-50 dark:bg-gray-900/20',
    borderClass: 'border-gray-200 dark:border-gray-800'
  }
};

export function BoardView({ specs, onStatusChange, basePath = '/projects/default', canEdit = true }: BoardViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<SpecStatus | null>(null);
  const { t } = useTranslation('common');

  const columns = useMemo(() => {
    const cols: SpecStatus[] = ['planned', 'in-progress', 'complete'];
    return cols;
  }, []);

  const specsByStatus = useMemo(() => {
    const grouped: Record<SpecStatus, Spec[]> = {
      'planned': [],
      'in-progress': [],
      'complete': [],
      'archived': []
    };

    specs.forEach((spec) => {
      const status = spec.status as SpecStatus | null;
      if (!status) return;
      grouped[status].push(spec);
    });

    return grouped;
  }, [specs]);

  const handleDragStart = (spec: Spec, e: DragEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    setDraggingId(spec.specName);
    e.dataTransfer.effectAllowed = 'move';
    // Set drag image or data if needed
  };

  const handleDragOver = (status: SpecStatus, e: DragEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropZone !== status) {
      setActiveDropZone(status);
    }
  };

  const handleDrop = (status: SpecStatus, e: DragEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    e.preventDefault();
    setActiveDropZone(null);

    if (draggingId) {
      const spec = specs.find(s => s.specName === draggingId);
      if (spec && spec.status !== status) {
        onStatusChange(spec, status);
      }
      setDraggingId(null);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6 h-full pb-2 md:snap-x md:snap-mandatory overflow-y-auto md:overflow-y-hidden md:overflow-x-auto">
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
              "p-3 flex items-center justify-between border-b sticky top-0 z-5",
              config.borderClass,
              config.bgClass,
              "rounded-t-lg"
            )}>
              <div className="flex items-center gap-2">
                <Icon className={cn("w-4 h-4", config.colorClass)} />
                <span className={cn("font-medium text-sm", config.colorClass)}>
                  {t(config.titleKey)}
                </span>
                <span className="text-xs px-2 py-0.5 bg-background/50 rounded-full text-muted-foreground">
                  {statusSpecs.length}
                </span>
              </div>
            </div>

            {/* Column Content */}
            <div className="flex-1 p-2 overflow-y-auto">
              <div className="space-y-2">
                {statusSpecs.map(spec => (
                  <div
                    key={spec.specName}
                    draggable={canEdit}
                    onDragStart={(e) => handleDragStart(spec, e)}
                    className={cn(
                      "bg-background p-4 rounded-xl border shadow-sm cursor-move hover:border-primary/50 transition-all group/card",
                      draggingId === spec.specName && "opacity-50",
                      !canEdit && "cursor-not-allowed opacity-70"
                    )}
                  >
                    <Link to={`${basePath}/specs/${spec.specName}`} className="select-none h-full flex flex-col">
                      {/* Top: #ID */}
                      <div className="text-xs text-muted-foreground font-mono mb-1">
                        #{spec.specNumber || spec.specName.split('-')[0].replace(/^0+/, '')}
                      </div>

                      {/* Middle: Title & Filename */}
                      <div className="space-y-1.5 mb-4 flex-1">
                        <h4 className="font-semibold text-base leading-snug group-hover/card:text-primary transition-colors">
                          {spec.title || spec.specName}
                        </h4>
                        <div className="text-xs text-muted-foreground font-mono truncate">
                          {spec.specName}
                        </div>
                      </div>

                      {/* Bottom: Priority & Tags */}
                      <div className="flex items-center justify-between gap-2 mt-auto">
                        {spec.priority && (
                          <PriorityBadge priority={spec.priority} className="h-6 px-2.5 rounded-md" />
                        )}

                        {spec.tags && spec.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 justify-end ml-auto">
                            {spec.tags.slice(0, 2).map((tag: string) => (
                              <span key={tag} className="text-[10px] px-2 py-0.5 bg-secondary/30 border border-border/50 rounded-md text-muted-foreground font-mono">
                                {tag}
                              </span>
                            ))}
                            {spec.tags.length > 2 && (
                              <span className="text-[10px] px-2 py-0.5 bg-secondary/30 border border-border/50 rounded-md text-muted-foreground font-mono">
                                +{spec.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
