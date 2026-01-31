import { useState, useMemo, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { Clock, PlayCircle, CheckCircle2, Archive, Umbrella, CornerDownRight, Layers, ChevronDown } from 'lucide-react';
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
  groupByParent?: boolean;
  showArchived?: boolean;
}

const COLLAPSE_THRESHOLD = 3;

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

interface BoardGroupProps {
  parentName: string;
  specs: Spec[];
  renderCard: (spec: Spec, isChild?: boolean) => React.ReactNode;
}

function BoardGroup({ parentName, specs, renderCard }: BoardGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleSpecs = isExpanded ? specs : specs.slice(0, COLLAPSE_THRESHOLD);
  const hiddenCount = specs.length - visibleSpecs.length;

  return (
    <div className="space-y-2 bg-secondary/10 p-2 rounded-lg border border-border/50">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Umbrella className="h-4 w-4 text-primary" />
        <h5 className="text-sm font-semibold text-foreground truncate flex-1" title={parentName}>{parentName}</h5>
        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{specs.length}</span>
      </div>
      <div className="pl-3 border-l-2 border-muted ml-2 space-y-2 relative">
        {/* Dot indicators for tree line */}
        {visibleSpecs.map((spec) => (
          <div key={spec.specName} className="relative">
            {/* Connection line dot */}
            <div className="absolute -left-[19px] top-6 w-1.5 h-1.5 rounded-full bg-muted-foreground/30"></div>
            {renderCard(spec, true)}
          </div>
        ))}

        {hiddenCount > 0 && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 py-1.5 rounded flex items-center justify-center gap-1 transition-colors"
          >
            <ChevronDown className="h-3 w-3" />
            Show {hiddenCount} more
          </button>
        )}
        {isExpanded && specs.length > COLLAPSE_THRESHOLD && (
          <button
            onClick={() => setIsExpanded(false)}
            className="w-full text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 py-1.5 rounded flex items-center justify-center gap-1 transition-colors"
          >
            <ChevronDown className="h-3 w-3 rotate-180" />
            Show less
          </button>
        )}
      </div>
    </div>
  );
}

export function BoardView({ specs, onStatusChange, basePath = '/projects', canEdit = true, groupByParent = false, showArchived = false }: BoardViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<SpecStatus | null>(null);
  const { t } = useTranslation('common');

  const columns = useMemo(() => {
    const cols: SpecStatus[] = ['planned', 'in-progress', 'complete'];
    if (showArchived) {
      cols.push('archived');
    }
    return cols;
  }, [showArchived]);

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

  const renderCard = (spec: Spec, isChild = false) => (
    <div
      key={spec.specName}
      draggable={canEdit}
      onDragStart={(e) => handleDragStart(spec, e)}
      className={cn(
        "bg-background rounded-xl border shadow-sm cursor-move hover:border-primary/50 transition-all group/card relative",
        isChild ? "p-3 border-border/60" : "p-4",
        draggingId === spec.specName && "opacity-50",
        !canEdit && "cursor-not-allowed opacity-70"
      )}
    >
      <Link to={`${basePath}/specs/${spec.specName}`} className="select-none h-full flex flex-col">
        {/* Umbrella Icon */}
        {(spec.children && spec.children.length > 0 && !isChild) && (
          <div className="absolute top-3 right-3 text-primary/50" title={t('specs.hierarchy.umbrella', 'Umbrella Spec')}>
            <Umbrella className="w-4 h-4" />
          </div>
        )}

        {/* Top: #ID */}
        <div className="text-xs text-muted-foreground font-mono mb-1 flex items-center gap-1">
          <span>#{spec.specNumber || spec.specName.split('-')[0].replace(/^0+/, '')}</span>
          {isChild && (spec.children && spec.children.length > 0) && (
            <Umbrella className="w-3 h-3 text-primary/40 ml-1" />
          )}
        </div>

        {/* Middle: Title & Filename */}
        <div className={cn("space-y-1 mb-3 flex-1", isChild ? "mb-2" : "mb-4")}>
          <h4 className={cn("font-semibold leading-snug group-hover/card:text-primary transition-colors pr-6", isChild ? "text-sm" : "text-base")}>
            {spec.title || spec.specName}
          </h4>
          {!isChild && (
            <div className="text-xs text-muted-foreground font-mono truncate">
              {spec.specName}
            </div>
          )}

          {/* Parent Indicator - shown only when NOT grouped by parent */}
          {spec.parent && !groupByParent && (
            <div className="flex items-center text-xs text-muted-foreground mt-1 bg-muted/30 p-1 rounded w-fit max-w-full">
              <CornerDownRight className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">In: {spec.parent}</span>
            </div>
          )}
        </div>

        {/* Bottom: Priority & Tags */}
        <div className="flex items-center justify-between gap-2 mt-auto">
          {spec.priority && (
            <PriorityBadge priority={spec.priority} className={cn("rounded-md", isChild ? "h-5 text-[10px] px-1.5" : "h-6 px-2.5")} iconOnly={isChild} />
          )}

          <div className="flex items-center gap-1.5 justify-end ml-auto">
            {spec.children && spec.children.length > 0 && !isChild && (
              <span className="text-[10px] px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-md text-primary font-medium flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {spec.children.length}
              </span>
            )}

            {spec.tags && spec.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-end">
                {spec.tags.slice(0, isChild ? 1 : 2).map((tag: string) => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 bg-secondary/30 border border-border/50 rounded-md text-muted-foreground font-mono">
                    {tag}
                  </span>
                ))}
                {spec.tags.length > (isChild ? 1 : 2) && (
                  <span className="text-[10px] px-2 py-0.5 bg-secondary/30 border border-border/50 rounded-md text-muted-foreground font-mono">
                    +{spec.tags.length - (isChild ? 1 : 2)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );

  const renderColumnContent = (columnSpecs: Spec[]) => {
    if (!groupByParent) {
      return (
        <div className="space-y-2">
          {columnSpecs.map(s => renderCard(s))}
        </div>
      );
    }

    // Group by parent
    const groups = new Map<string, Spec[]>();
    const orphans: Spec[] = [];

    columnSpecs.forEach(spec => {
      if (spec.parent) {
        if (!groups.has(spec.parent)) {
          groups.set(spec.parent, []);
        }
        groups.get(spec.parent)!.push(spec);
      } else {
        orphans.push(spec);
      }
    });

    const sortedGroups = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    return (
      <div className="space-y-4">
        {orphans.length > 0 && (
          <div className="space-y-2">
            {orphans.length > 0 && sortedGroups.length > 0 && (
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Independent ({orphans.length})</h5>
            )}
            {orphans.map(s => renderCard(s))}
          </div>
        )}

        {sortedGroups.map(([parentName, groupSpecs]) => (
          <BoardGroup
            key={parentName}
            parentName={parentName}
            specs={groupSpecs}
            renderCard={renderCard}
          />
        ))}
      </div>
    );
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
              "p-3 flex items-center justify-between border-b sticky top-0 z-10 backdrop-blur-sm bg-opacity-90",
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
              {renderColumnContent(statusSpecs)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
