/**
 * Metadata card component with icons for spec details
 */

import { Calendar, User, Tag, GitBranch, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/status-badge';
import { PriorityBadge } from '@/components/priority-badge';
import { formatDate, formatRelativeTime } from '@/lib/date-utils';
import type { Spec } from '@/lib/db/schema';

interface SpecMetadataProps {
  spec: Spec & { tags: string[] | null };
}

export function SpecMetadata({ spec }: SpecMetadataProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <dl className="grid grid-cols-2 gap-4">
          {/* Status */}
          <div>
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
              Status
            </dt>
            <dd>
              <StatusBadge status={spec.status || 'planned'} />
            </dd>
          </div>

          {/* Priority */}
          <div>
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
              Priority
            </dt>
            <dd>
              <PriorityBadge priority={spec.priority || 'medium'} />
            </dd>
          </div>

          {/* Created */}
          <div>
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
              <Calendar className="h-4 w-4" />
              Created
            </dt>
            <dd className="text-sm">
              {formatDate(spec.createdAt)}
              {spec.createdAt && (
                <span className="text-muted-foreground ml-1">
                  ({formatRelativeTime(spec.createdAt)})
                </span>
              )}
            </dd>
          </div>

          {/* Updated */}
          <div>
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
              <Calendar className="h-4 w-4" />
              Updated
            </dt>
            <dd className="text-sm">
              {formatDate(spec.updatedAt)}
              {spec.updatedAt && (
                <span className="text-muted-foreground ml-1">
                  ({formatRelativeTime(spec.updatedAt)})
                </span>
              )}
            </dd>
          </div>

          {/* Assignee */}
          {spec.assignee && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                <User className="h-4 w-4" />
                Assignee
              </dt>
              <dd>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {spec.assignee.substring(0, 2).toUpperCase()}
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
                Tags
              </dt>
              <dd className="flex gap-1 flex-wrap">
                {spec.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
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
                Source
              </dt>
              <dd>
                <a
                  href={spec.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View on GitHub
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
