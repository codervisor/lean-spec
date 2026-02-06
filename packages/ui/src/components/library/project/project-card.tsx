/**
 * ProjectCard component
 * Displays a project card with avatar, name, description, and stats
 */

import { Star, FileText, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProjectAvatar } from './project-avatar';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/date-utils';

export interface ProjectCardData {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  favorite?: boolean;
  specsCount?: number;
  updatedAt?: string | Date | null;
  tags?: string[];
}

export interface ProjectCardProps {
  /** Project data to display */
  project: ProjectCardData;
  /** Click handler for the card */
  onClick?: () => void;
  /** Handler for favorite toggle */
  onFavoriteToggle?: (favorite: boolean) => void;
  /** Handler for more options */
  onMoreOptions?: () => void;
  /** Whether the card is currently selected */
  selected?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Locale for date formatting */
  locale?: string;
  /** Labels for localization */
  labels?: {
    specs?: string;
    spec?: string;
    updated?: string;
    noDescription?: string;
    toggleFavorite?: string;
    moreOptions?: string;
  };
}

const defaultLabels = {
  specs: 'specs',
  spec: 'spec',
  updated: 'Updated',
  noDescription: 'No description',
  toggleFavorite: 'Toggle favorite',
  moreOptions: 'More options',
};

export function ProjectCard({
  project,
  onClick,
  onFavoriteToggle,
  onMoreOptions,
  selected = false,
  className,
  locale,
  labels = {},
}: ProjectCardProps) {
  const l = { ...defaultLabels, ...labels };
  const specsLabel = project.specsCount === 1 ? l.spec : l.specs;

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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <ProjectAvatar
              name={project.name}
              color={project.color || undefined}
              icon={project.icon || undefined}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base leading-tight truncate">
                  {project.name}
                </h3>
                {project.favorite && (
                  <Star className="h-4 w-4 shrink-0 fill-yellow-500 text-yellow-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {project.description || l.noDescription}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onFavoriteToggle && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onFavoriteToggle(!project.favorite);
                }}
                aria-label={l.toggleFavorite}
              >
                <Star
                  className={cn(
                    'h-4 w-4',
                    project.favorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
                  )}
                />
              </Button>
            )}
            {onMoreOptions && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoreOptions();
                }}
                aria-label={l.moreOptions}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-3">
        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {project.tags.slice(0, 3).map((tag, index) => (
              <Badge
                key={`${tag}-${index}`}
                variant="secondary"
                className="text-xs px-1.5 py-0 h-5"
              >
                {tag}
              </Badge>
            ))}
            {project.tags.length > 3 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                +{project.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            <span>
              {project.specsCount ?? 0} {specsLabel}
            </span>
          </div>
          {project.updatedAt && (
            <span>
              {l.updated} {formatRelativeTime(project.updatedAt, locale)}
            </span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
