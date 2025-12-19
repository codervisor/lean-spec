/**
 * SpecCard component for displaying a compact spec summary
 */

import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from './status-badge';
import { PriorityBadge } from './priority-badge';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/date-utils';
import type { LightweightSpec } from '@/types/specs';

export interface SpecCardProps {
  /** Spec data to display */
  spec: Pick<
    LightweightSpec,
    'specNumber' | 'specName' | 'title' | 'status' | 'priority' | 'tags' | 'updatedAt'
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
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-muted-foreground">{displayNumber}</span>
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
