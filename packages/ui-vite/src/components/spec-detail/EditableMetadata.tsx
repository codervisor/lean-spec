import { Calendar, GitBranch, Tag, User, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@leanspec/ui-components';
import { StatusBadge } from '../StatusBadge';
import { PriorityBadge } from '../PriorityBadge';
import { StatusEditor } from '../metadata-editors/StatusEditor';
import { PriorityEditor } from '../metadata-editors/PriorityEditor';
import { TagsEditor } from '../metadata-editors/TagsEditor';
import { formatDate, formatRelativeTime } from '../../lib/date-utils';
import type { SpecDetail } from '../../lib/api';

interface EditableMetadataProps {
  spec: SpecDetail;
  onSpecChange?: (updates: Partial<SpecDetail>) => void;
}

export function EditableMetadata({ spec, onSpecChange }: EditableMetadataProps) {
  const created = spec.metadata?.created_at || spec.createdAt;
  const updated = spec.metadata?.updated_at || spec.updatedAt;
  const githubUrl = spec.metadata?.github_url;
  const assignee = spec.metadata?.assignee;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-muted-foreground mb-1">Status</dt>
            <dd className="flex items-center gap-2">
              {spec.status && <StatusBadge status={spec.status} />}
              <StatusEditor
                specName={spec.name}
                value={spec.status}
                onChange={(status) => onSpecChange?.({ status })}
              />
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-muted-foreground mb-1">Priority</dt>
            <dd className="flex items-center gap-2">
              {spec.priority && <PriorityBadge priority={spec.priority} />}
              <PriorityEditor
                specName={spec.name}
                value={spec.priority}
                onChange={(priority) => onSpecChange?.({ priority })}
              />
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4" />
              Created
            </dt>
            <dd className="text-sm">
              {formatDate(created)}
              {created && (
                <span className="text-muted-foreground ml-1">
                  ({formatRelativeTime(created)})
                </span>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4" />
              Updated
            </dt>
            <dd className="text-sm">
              {formatDate(updated)}
              {updated && (
                <span className="text-muted-foreground ml-1">
                  ({formatRelativeTime(updated)})
                </span>
              )}
            </dd>
          </div>

          {assignee && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                <User className="h-4 w-4" />
                Assignee
              </dt>
              <dd className="text-sm">{assignee}</dd>
            </div>
          )}

          <div className={assignee ? '' : 'col-span-2'}>
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
              <Tag className="h-4 w-4" />
              Tags
            </dt>
            <dd>
              <TagsEditor
                specName={spec.name}
                value={spec.tags}
                onChange={(tags) => onSpecChange?.({ tags })}
              />
            </dd>
          </div>

          {githubUrl && (
            <div className="col-span-2">
              <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                <GitBranch className="h-4 w-4" />
                Source
              </dt>
              <dd>
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
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
