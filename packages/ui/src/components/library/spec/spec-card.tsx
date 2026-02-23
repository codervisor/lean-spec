/**
 * SpecCard component for displaying a compact spec summary
 */

import { FileText, Umbrella, CornerDownRight, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { StatusBadge } from './status-badge';
import { PriorityBadge } from './priority-badge';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/date-utils';
import type { LightweightSpec } from '@/types/specs';

export interface SpecCardProps {
  /** Spec data to display */
  spec: Pick<
    LightweightSpec,
    'specNumber' | 'specName' | 'title' | 'status' | 'priority' | 'tags' | 'updatedAt' | 'parent' | 'children' | 'subSpecsCount'
  >;
  /** Click handler */
  onClick?: () => void;
  /** Whether the card is currently selected */
  selected?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Locale for date formatting */
  locale?: string;
  /** Maximum number of tags to display */
  maxTags?: number;
}

export function SpecCard({
  spec,
  onClick,
  selected = false,
  className,
  locale,
  maxTags = 3,
}: SpecCardProps) {
  const displayTitle = spec.title || spec.specName;
  const displayNumber = spec.specNumber
    ? `#${String(spec.specNumber).padStart(3, '0')}`
    : spec.specName;
  const tags = spec.tags || [];
  const visibleTags = tags.slice(0, maxTags);
  const remainingTagsCount = tags.length - maxTags;
  
  // Hierarchy info
  const hasChildren = (spec.children && spec.children.length > 0) || (spec.subSpecsCount && spec.subSpecsCount > 0);
  const childrenCount = spec.children?.length || spec.subSpecsCount || 0;
  const parentName = spec.parent;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
        selected && 'border-primary ring-2 ring-primary/20',
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren ? (
              <Umbrella className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className="text-sm font-medium text-muted-foreground">{displayNumber}</span>
            {parentName && (
              <div className="flex items-center text-xs text-muted-foreground ml-1 max-w-[120px] truncate">
                <CornerDownRight className="h-3 w-3 mr-0.5" />
                <span className="truncate" title={`Child of ${parentName}`}>{parentName}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={spec.status} iconOnly />
            {spec.priority && <PriorityBadge priority={spec.priority} iconOnly />}
          </div>
        </div>
        <h3 className="font-semibold text-base leading-tight truncate" title={displayTitle}>
          {displayTitle}
        </h3>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {visibleTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs px-1.5 py-0 h-5"
            >
              {tag}
            </Badge>
          ))}
          {remainingTagsCount > 0 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
              +{remainingTagsCount}
            </Badge>
          )}
          {hasChildren && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 ml-auto flex items-center gap-1 border-primary/20 bg-primary/5">
              <Layers className="h-3 w-3" />
              <span>{childrenCount}</span>
            </Badge>
          )}
        </div>
        {spec.updatedAt && (
          <p className="text-xs text-muted-foreground">
            Updated {formatRelativeTime(spec.updatedAt, locale)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
