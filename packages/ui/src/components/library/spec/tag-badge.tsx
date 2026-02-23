/**
 * Tag badge component for displaying spec tags
 */

import { Tag } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

export interface TagBadgeProps {
  /** Tag name to display */
  tag: string;
  /** Additional CSS classes */
  className?: string;
  /** Show icon */
  showIcon?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Whether the tag is removable */
  removable?: boolean;
  /** Remove handler */
  onRemove?: () => void;
}

export function TagBadge({
  tag,
  className,
  showIcon = false,
  onClick,
  removable = false,
  onRemove,
}: TagBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'flex items-center gap-1',
        onClick && 'cursor-pointer hover:bg-secondary/80',
        className
      )}
      onClick={onClick}
    >
      {showIcon && <Tag className="h-3 w-3" />}
      <span>{tag}</span>
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
          aria-label={`Remove tag ${tag}`}
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </Badge>
  );
}

export interface TagListProps {
  /** Tags to display */
  tags: string[];
  /** Maximum tags to show before truncating */
  maxVisible?: number;
  /** Additional CSS classes */
  className?: string;
  /** Click handler for individual tags */
  onTagClick?: (tag: string) => void;
}

export function TagList({ tags, maxVisible = 5, className, onTagClick }: TagListProps) {
  if (!tags || tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = tags.length - maxVisible;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {visibleTags.map((tag, index) => (
        <TagBadge
          key={`${tag}-${index}`}
          tag={tag}
          onClick={onTagClick ? () => onTagClick(tag) : undefined}
        />
      ))}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
}
