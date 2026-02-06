import { useState, useMemo, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { Clock, PlayCircle, CheckCircle2, Archive, FolderTree, CornerDownRight, Layers, ChevronDown, ChevronRight } from 'lucide-react';
import type { Spec } from '../../types/api';
import { PriorityBadge } from '../priority-badge';
import { TokenBadge } from '../token-badge';
import { ValidationBadge } from '../validation-badge';
import { cn } from '@/library';
import { useTranslation } from 'react-i18next';

type SpecStatus = 'planned' | 'in-progress' | 'complete' | 'archived';

interface BoardViewProps {
  specs: Spec[];
  onStatusChange: (spec: Spec, status: SpecStatus) => void;
  onPriorityChange?: (spec: Spec, priority: string) => void;
  basePath?: string;
  canEdit?: boolean;
  groupByParent?: boolean;
  showArchived?: boolean;
  onTokenClick?: (specName: string) => void;
  onValidationClick?: (specName: string) => void;
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

interface SpecCardCompactProps {
  spec: Spec;
  basePath: string;
  canEdit?: boolean;
  draggingId?: string | null;
  onDragStart?: (spec: Spec, e: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
  onTokenClick?: (specName: string) => void;
  onValidationClick?: (specName: string) => void;
  onPriorityChange?: (spec: Spec, priority: string) => void;
  // For umbrella specs
  childCount?: number;
  isExpanded?: boolean;
  onToggle?: () => void;
}

/** Compact card style used for both umbrella and independent specs */
function SpecCardCompact({ spec, basePath, canEdit = true, draggingId, onDragStart, onDragEnd, onTokenClick, onValidationClick, onPriorityChange, childCount, isExpanded, onToggle }: SpecCardCompactProps) {
  const isUmbrella = childCount !== undefined && onToggle !== undefined;
  return (
    <div
      className={cn(
        "bg-background rounded-xl border border-primary/20 shadow-sm relative overflow-hidden group/parent hover:border-primary/50 hover:shadow-md transition-all",
        draggingId === spec.specName && "opacity-50",
        canEdit ? "cursor-move" : "cursor-not-allowed opacity-70"
      )}
      draggable={canEdit}
      onDragStart={onDragStart ? (e) => onDragStart(spec, e) : undefined}
      onDragEnd={onDragEnd}
    >
      {/* Accent Header/Background */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 to-primary/10" />

      <div className="p-3 pb-2 flex flex-col gap-2">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2">
          <Link to={`${basePath}/specs/${spec.specName}`} className="flex-1 min-w-0 group hover:text-primary transition-colors">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-mono font-medium text-primary/70 bg-primary/5 px-1 rounded">
                #{spec.specNumber || spec.specName.split('-')[0].replace(/^0+/, '')}
              </span>
              {isUmbrella && <FolderTree className="h-3 w-3 text-primary/40" />}
            </div>
            <h4 className="font-semibold text-sm truncate leading-tight" title={spec.title || spec.specName}>
              {spec.title || spec.specName}
            </h4>
          </Link>

          {isUmbrella && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onToggle!();
              }}
              className="p-1 hover:bg-muted rounded-md text-muted-foreground transition-colors"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Tags */}
        {spec.tags && spec.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {spec.tags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
            {spec.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{spec.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Metadata Row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            {/* Status Icon */}
            {spec.status && STATUS_CONFIG[spec.status as SpecStatus] && (() => {
              const statusConfig = STATUS_CONFIG[spec.status as SpecStatus];
              const StatusIcon = statusConfig.icon;
              return (
                <StatusIcon className={cn("h-3.5 w-3.5", statusConfig.colorClass)} />
              );
            })()}
            {spec.priority && (
              <PriorityBadge 
                priority={spec.priority} 
                className="h-5 text-[10px] px-1.5" 
                editable={!!onPriorityChange && canEdit}
                onChange={(priority) => onPriorityChange?.(spec, priority)}
              />
            )}
            {isUmbrella && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1" title={`${childCount} children`}>
                <Layers className="h-3 w-3" />
                {childCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <TokenBadge
              count={spec.tokenCount}
              size="sm"
              onClick={onTokenClick ? () => onTokenClick(spec.specName) : undefined}
              className="h-5 px-1.5 scale-90 origin-right"
            />
            {spec.validationStatus && spec.validationStatus !== 'pass' && (
              <ValidationBadge
                status={spec.validationStatus}
                size="sm"
                onClick={onValidationClick ? () => onValidationClick(spec.specName) : undefined}
                className="h-5 px-1.5 scale-90 origin-right"
              />
            )}
          </div>
        </div>
      </div>

      {/* Collapse Hint Bar (visible when collapsed, umbrella only) */}
      {isUmbrella && !isExpanded && (
        <div
          onClick={onToggle}
          className="bg-muted/30 p-1 flex justify-center cursor-pointer hover:bg-muted/50 transition-colors border-t border-border/20"
        >
          <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
        </div>
      )}
    </div>
  );
}

interface BoardGroupProps {
  parentName: string;
  specs: Spec[];
  parentSpec?: Spec;
  basePath: string;
  onTokenClick?: (specName: string) => void;
  onValidationClick?: (specName: string) => void;
  onPriorityChange?: (spec: Spec, priority: string) => void;
}

interface BoardGroupExtendedProps extends BoardGroupProps {
  canEdit?: boolean;
  draggingId?: string | null;
  onDragStart?: (spec: Spec, e: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
}

function BoardGroup({ parentName, specs, parentSpec, basePath, onTokenClick, onValidationClick, onPriorityChange, canEdit, draggingId, onDragStart, onDragEnd }: BoardGroupExtendedProps) {
  // Session storage key
  const storageKey = `leanspec_board_expanded_${parentName}`;

  // Default expanded if few children, otherwise collapsed
  const defaultExpanded = specs.length <= COLLAPSE_THRESHOLD;

  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      return stored !== null ? stored === 'true' : defaultExpanded;
    } catch {
      return defaultExpanded;
    }
  });

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    try {
      sessionStorage.setItem(storageKey, String(newState));
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-2 mt-4 first:mt-0">
      {parentSpec ? (
        <SpecCardCompact
          spec={parentSpec}
          childCount={specs.length}
          isExpanded={isExpanded}
          onToggle={handleToggle}
          basePath={basePath}
          canEdit={canEdit}
          draggingId={draggingId}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onTokenClick={onTokenClick}
          onValidationClick={onValidationClick}
          onPriorityChange={onPriorityChange}
        />
      ) : (
        <div
          className="flex items-center gap-2 px-1 pb-1 border-b border-border/30 cursor-pointer hover:bg-muted/20 rounded p-1"
          onClick={handleToggle}
        >
          <FolderTree className="h-3.5 w-3.5 text-primary/70" />
          <h5 className="text-xs font-semibold text-foreground/80 truncate flex-1" title={parentName}>{parentName}</h5>
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground font-mono">{specs.length}</span>
          {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        </div>
      )}

      {isExpanded && (
        <div className={cn("space-y-2 transition-all", parentSpec && "pl-2 border-l-2 border-border/30 ml-2")}>
          {specs.map((spec) => (
            <SpecCardCompact
              key={spec.specName}
              spec={spec}
              basePath={basePath}
              canEdit={canEdit}
              draggingId={draggingId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onTokenClick={onTokenClick}
              onValidationClick={onValidationClick}
              onPriorityChange={onPriorityChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function BoardView({ specs, onStatusChange, onPriorityChange, basePath = '/projects', canEdit = true, groupByParent = false, showArchived = false, onTokenClick, onValidationClick }: BoardViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<SpecStatus | null>(null);
  const { t } = useTranslation('common');

  // Spec Map for parent lookup
  const specMap = useMemo(() => {
    return new Map(specs.map(s => [s.specName, s]));
  }, [specs]);

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

  const handleDragEnd = () => {
    setDraggingId(null);
    setActiveDropZone(null);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // Only clear if leaving the column entirely (not entering a child element)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setActiveDropZone(null);
    }
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
      onDragEnd={handleDragEnd}
      className={cn(
        "bg-background rounded-xl border shadow-sm cursor-move hover:border-primary/50 transition-all group/card relative",
        isChild ? "p-2.5 border-border/50 text-sm shadow-none bg-background/50" : "p-4",
        draggingId === spec.specName && "opacity-50",
        !canEdit && "cursor-not-allowed opacity-70"
      )}
    >
      <Link to={`${basePath}/specs/${spec.specName}`} className="select-none h-full flex flex-col">
        {/* Parent Spec Icon */}
        {(spec.children && spec.children.length > 0 && !isChild) && (
          <div className="absolute top-3 right-3 text-primary/50" title={t('specs.hierarchy.umbrella')}>
            <FolderTree className="w-4 h-4" />
          </div>
        )}

        {/* Top: #ID */}
        <div className="text-xs text-muted-foreground font-mono mb-1 flex items-center gap-1">
          <span className={cn(isChild && "text-[10px]")}>#{spec.specNumber || spec.specName.split('-')[0].replace(/^0+/, '')}</span>
          {isChild && (spec.children && spec.children.length > 0) && (
            <FolderTree className="w-3 h-3 text-primary/40 ml-1" />
          )}
        </div>

        {/* Middle: Title & Filename */}
        <div className={cn("space-y-1 mb-3 flex-1", isChild ? "mb-1.5" : "mb-4")}>
          <h4 className={cn("font-semibold leading-snug group-hover/card:text-primary transition-colors pr-6", isChild ? "text-xs" : "text-base")}>
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
              <span className="truncate">{t('specs.hierarchy.inParent', { parent: spec.parent })}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {spec.tags && spec.tags.length > 0 && (
          <div className={cn("flex flex-wrap gap-1.5 mb-3", isChild ? "mb-1.5" : "mb-3")}>
            {spec.tags.slice(0, isChild ? 2 : 4).map((tag: string) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 bg-secondary/30 border border-border/50 rounded-md text-muted-foreground font-mono truncate max-w-[120px]">
                {tag}
              </span>
            ))}
            {spec.tags.length > (isChild ? 2 : 4) && (
              <span className="text-[10px] px-1.5 py-0.5 bg-secondary/20 border border-border/30 rounded-md text-muted-foreground/70 font-mono">
                +{spec.tags.length - (isChild ? 2 : 4)}
              </span>
            )}
          </div>
        )}

        {/* Bottom: Priority & Stats */}
        <div className="flex items-center justify-between gap-2 mt-auto">
          {spec.priority && (
            <PriorityBadge 
                priority={spec.priority} 
                className={cn("rounded-md", isChild ? "h-5 text-[10px] px-1.5 scale-90 origin-left" : "h-6 px-2.5")} 
                iconOnly={isChild} 
                editable={!!onPriorityChange && canEdit}
                onChange={(priority) => onPriorityChange?.(spec, priority)}
            />
          )}

          <div className="flex items-center gap-1.5 justify-end ml-auto">
            <TokenBadge
              count={spec.tokenCount}
              size="sm"
              onClick={onTokenClick ? () => onTokenClick(spec.specName) : undefined}
              className={cn(isChild && "px-1.5 h-5 scale-90 origin-right")}
              showIcon={!isChild}
            />
            <ValidationBadge
              status={spec.validationStatus}
              size="sm"
              onClick={onValidationClick ? () => onValidationClick(spec.specName) : undefined}
              className={cn(isChild && "px-1.5 h-5 scale-90 origin-right")}
            />
            {spec.children && spec.children.length > 0 && !isChild && (
              <span className="text-[10px] px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-md text-primary font-medium flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {spec.children.length}
              </span>
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

    // When grouping by parent:
    // - Umbrella specs (specs with children) show with ALL their children nested
    // - Child specs are excluded from top-level (they appear nested under parent)
    // - Orphan specs (no parent, no children) appear independently

    const umbrellaSpecs: Spec[] = [];
    const orphans: Spec[] = [];

    // Set of all child spec names (to exclude from independent rendering)
    const allChildNames = new Set<string>();
    specs.forEach(spec => {
      if (spec.children && spec.children.length > 0) {
        spec.children.forEach(childName => allChildNames.add(childName));
      }
    });

    columnSpecs.forEach(spec => {
      // Is this spec a child of another spec? Skip it at top level
      if (allChildNames.has(spec.specName)) {
        return;
      }

      // Is this an umbrella spec (has children)?
      if (spec.children && spec.children.length > 0) {
        umbrellaSpecs.push(spec);
      } else {
        orphans.push(spec);
      }
    });

    // Sort umbrellas by spec name
    umbrellaSpecs.sort((a, b) => a.specName.localeCompare(b.specName));

    return (
      <div className="space-y-2">
        {/* Independent specs - use compact card style, no header */}
        {orphans.map(s => (
          <SpecCardCompact
            key={s.specName}
            spec={s}
            basePath={basePath}
            canEdit={canEdit}
            draggingId={draggingId}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onTokenClick={onTokenClick}
            onValidationClick={onValidationClick}
            onPriorityChange={onPriorityChange}
          />
        ))}

        {umbrellaSpecs.map((parentSpec) => {
          // Get ALL children of this umbrella spec (from full specs list, not just this column)
          const childSpecs = (parentSpec.children || [])
            .map(childName => specMap.get(childName))
            .filter((s): s is Spec => s !== undefined);

          return (
            <BoardGroup
              key={parentSpec.specName}
              parentName={parentSpec.specName}
              specs={childSpecs}
              parentSpec={parentSpec}
              basePath={basePath}
              canEdit={canEdit}
              draggingId={draggingId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onTokenClick={onTokenClick}
              onValidationClick={onValidationClick}
              onPriorityChange={onPriorityChange}
            />
          );
        })}
      </div>
    );
  };

  // Compute column count: when groupByParent, count only umbrellas + orphans (not nested children)
  const getColumnCount = (columnSpecs: Spec[]) => {
    if (!groupByParent) {
      return columnSpecs.length;
    }

    const allChildNames = new Set<string>();
    specs.forEach(spec => {
      if (spec.children && spec.children.length > 0) {
        spec.children.forEach(childName => allChildNames.add(childName));
      }
    });

    return columnSpecs.filter(spec => !allChildNames.has(spec.specName)).length;
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
            onDragLeave={handleDragLeave}
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
                  {getColumnCount(statusSpecs)}
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
