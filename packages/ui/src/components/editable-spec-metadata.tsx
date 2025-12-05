/**
 * Editable metadata card component for spec details
 * Allows inline editing of status, priority, and tags
 */

'use client';

import { Calendar, User, Tag, GitBranch, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusEditor } from '@/components/status-editor';
import { PriorityEditor } from '@/components/priority-editor';
import { TagsEditor } from '@/components/tags-editor';
import { formatDate, formatRelativeTime } from '@/lib/date-utils';
import type { Spec } from '@/lib/db/schema';

interface EditableSpecMetadataProps {
  spec: Spec & { tags: string[] | null };
  projectId: string;
  onMetadataUpdate?: (field: string, value: unknown) => void;
}

export function EditableSpecMetadata({ spec, projectId, onMetadataUpdate }: EditableSpecMetadataProps) {
  const specIdentifier = spec.specNumber?.toString() || spec.id;

  return (
    <Card>
      <CardContent className="pt-6">
        <dl className="grid grid-cols-2 gap-4">
          {/* Status - Editable */}
          <div>
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
              Status
            </dt>
            <dd>
              <StatusEditor
                specId={specIdentifier}
                currentStatus={spec.status || 'planned'}
                projectId={projectId}
                onUpdate={(newStatus) => onMetadataUpdate?.('status', newStatus)}
              />
            </dd>
          </div>

          {/* Priority - Editable */}
          <div>
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
              Priority
            </dt>
            <dd>
              <PriorityEditor
                specId={specIdentifier}
                currentPriority={spec.priority || 'medium'}
                projectId={projectId}
                onUpdate={(newPriority) => onMetadataUpdate?.('priority', newPriority)}
              />
            </dd>
          </div>

          {/* Created - Read only */}
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

          {/* Updated - Read only */}
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

          {/* Assignee - Read only for now */}
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

          {/* Tags - Editable */}
          <div className={spec.assignee ? '' : 'col-span-2'}>
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
              <Tag className="h-4 w-4" />
              Tags
            </dt>
            <dd>
              <TagsEditor
                specId={specIdentifier}
                currentTags={spec.tags || []}
                projectId={projectId}
                onUpdate={(newTags) => onMetadataUpdate?.('tags', newTags)}
              />
            </dd>
          </div>

          {/* GitHub URL - Read only */}
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
