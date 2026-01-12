import { Calendar, GitBranch, Tag, User, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@leanspec/ui-components';
import { StatusBadge } from '../StatusBadge';
import { PriorityBadge } from '../PriorityBadge';
import { StatusEditor } from '../metadata-editors/StatusEditor';
import { PriorityEditor } from '../metadata-editors/PriorityEditor';
import { TagsEditor } from '../metadata-editors/TagsEditor';
import { formatDate, formatRelativeTime } from '../../lib/date-utils';
import type { SpecDetail } from '../../types/api';
import { useTranslation } from 'react-i18next';

interface EditableMetadataProps {
  spec: SpecDetail;
  onSpecChange?: (updates: Partial<SpecDetail>) => void;
}

export function EditableMetadata({ spec, onSpecChange }: EditableMetadataProps) {
  const created = (spec.metadata?.created_at as string | undefined) || spec.createdAt;
  const updated = (spec.metadata?.updated_at as string | undefined) || spec.updatedAt;
  const githubUrl = spec.metadata?.github_url as string | undefined;
  const assignee = spec.metadata?.assignee as string | undefined;
  const { t, i18n } = useTranslation('common');

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-muted-foreground mb-1">{t('specsPage.filters.status')}</dt>
            <dd className="flex items-center gap-2">
              {spec.status && <StatusBadge status={spec.status} />}
              <StatusEditor
                specName={spec.specName}
                value={spec.status}
                onChange={(status) => onSpecChange?.({ status })}
              />
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-muted-foreground mb-1">{t('specsPage.filters.priority')}</dt>
            <dd className="flex items-center gap-2">
              {spec.priority && <PriorityBadge priority={spec.priority} />}
              <PriorityEditor
                specName={spec.specName}
                value={spec.priority}
                onChange={(priority) => onSpecChange?.({ priority })}
              />
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4" />
              {t('specDetail.metadata.created')}
            </dt>
            <dd className="text-sm">
              {formatDate(created, i18n.language)}
              {created && (
                <span className="text-muted-foreground ml-1">
                  ({formatRelativeTime(created, i18n.language)})
                </span>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4" />
              {t('specDetail.metadata.updated')}
            </dt>
            <dd className="text-sm">
              {formatDate(updated, i18n.language)}
              {updated && (
                <span className="text-muted-foreground ml-1">
                  ({formatRelativeTime(updated, i18n.language)})
                </span>
              )}
            </dd>
          </div>

          {assignee && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                <User className="h-4 w-4" />
                {t('specDetail.metadata.assignee')}
              </dt>
              <dd className="text-sm">{assignee}</dd>
            </div>
          )}

          <div className={assignee ? '' : 'col-span-2'}>
            <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
              <Tag className="h-4 w-4" />
              {t('spec.tags')}
            </dt>
            <dd>
              <TagsEditor
                specName={spec.specName}
                value={spec.tags}
                onChange={(tags) => onSpecChange?.({ tags })}
              />
            </dd>
          </div>

          {githubUrl && (
            <div className="col-span-2">
              <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                <GitBranch className="h-4 w-4" />
                {t('specDetail.metadata.source')}
              </dt>
              <dd>
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  {t('specDetail.metadata.viewOnGitHub')}
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
