/**
 * SpecMetadata component
 * Displays spec metadata in a card format with icons
 */

import { Calendar, User, Tag, GitBranch, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { StatusBadge } from './status-badge';
import { PriorityBadge } from './priority-badge';
import { formatDate, formatRelativeTime } from '@/lib/date-utils';
import { getInitials } from '@/lib/color-utils';
import { cn } from '@/lib/utils';

export interface SpecMetadataData {
  status?: string | null;
  priority?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  completedAt?: string | Date | null;
  assignee?: string | null;
  tags?: string[] | null;
  githubUrl?: string | null;
}

export interface SpecMetadataProps {
  /** Spec data to display */
  spec: SpecMetadataData;
  /** Additional CSS classes */
  className?: string;
  /** Locale for date formatting */
  locale?: string;
  /** Labels for the metadata fields */
  labels?: {
    status?: string;
    priority?: string;
    created?: string;
    updated?: string;
    completed?: string;
    assignee?: string;
    tags?: string;
    source?: string;
    viewOnGitHub?: string;
  };
}

const defaultLabels = {
  status: 'Status',
  priority: 'Priority',
  created: 'Created',
  updated: 'Updated',
  completed: 'Completed',
  assignee: 'Assignee',
  tags: 'Tags',
  source: 'Source',
  viewOnGitHub: 'View on GitHub',
};

export function SpecMetadata({ spec, className, locale, labels = {} }: SpecMetadataProps) {
  const l = { ...defaultLabels, ...labels };

  return (
    <Card className={cn(className)}>
      <CardContent className="pt-6">
        <dl className="grid grid-cols-2 gap-4">
          {/* Status */}
          <div>
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
              {l.status}
            </dt>
            <dd>
              <StatusBadge status={spec.status || 'planned'} />
            </dd>
          </div>

          {/* Priority */}
          <div>
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
              {l.priority}
            </dt>
            <dd>
              <PriorityBadge priority={spec.priority || 'medium'} />
            </dd>
          </div>

          {/* Created */}
          <div>
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
              <Calendar className="h-4 w-4" />
              {l.created}
            </dt>
            <dd className="text-sm">
              {spec.createdAt ? (
                <>
                  {formatDate(spec.createdAt, locale)}
                  <span className="text-muted-foreground ml-1">
                    ({formatRelativeTime(spec.createdAt, locale)})
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </dd>
          </div>

          {/* Updated */}
          <div>
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
              <Calendar className="h-4 w-4" />
              {l.updated}
            </dt>
            <dd className="text-sm">
              {spec.updatedAt ? (
                <>
                  {formatDate(spec.updatedAt, locale)}
                  <span className="text-muted-foreground ml-1">
                    ({formatRelativeTime(spec.updatedAt, locale)})
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </dd>
          </div>

          {/* Completed */}
          {spec.completedAt && (
            <div className="col-span-2">
              <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                <Calendar className="h-4 w-4" />
                {l.completed}
              </dt>
              <dd className="text-sm">
                {formatDate(spec.completedAt, locale)}
                <span className="text-muted-foreground ml-1">
                  ({formatRelativeTime(spec.completedAt, locale)})
                </span>
              </dd>
            </div>
          )}

          {/* Assignee */}
          {spec.assignee && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                <User className="h-4 w-4" />
                {l.assignee}
              </dt>
              <dd>
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback className="text-xs">
                      {getInitials(spec.assignee)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{spec.assignee}</span>
                </div>
              </dd>
            </div>
          )}

          {/* Tags */}
          {spec.tags && spec.tags.length > 0 && (
            <div className={spec.assignee ? '' : 'col-span-2'}>
              <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                <Tag className="h-4 w-4" />
                {l.tags}
              </dt>
              <dd className="flex gap-1 flex-wrap">
                {spec.tags.map((tag, index) => (
                  <Badge key={`${tag}-${index}`} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </dd>
            </div>
          )}

          {/* GitHub URL */}
          {spec.githubUrl && (
            <div className="col-span-2">
              <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                <GitBranch className="h-4 w-4" />
                {l.source}
              </dt>
              <dd>
                <a
                  href={spec.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {l.viewOnGitHub}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
