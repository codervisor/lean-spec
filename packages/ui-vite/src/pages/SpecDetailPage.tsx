import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, RefreshCcw } from 'lucide-react';
import { Button, Card, CardContent } from '@leanspec/ui-components';
import { APIError, api, type SpecDetail } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { SubSpecTabs, type SubSpec } from '../components/spec-detail/SubSpecTabs';
import { TableOfContents, TableOfContentsSidebar } from '../components/spec-detail/TableOfContents';
import { EditableMetadata } from '../components/spec-detail/EditableMetadata';
import { SpecDetailSkeleton } from '../components/shared/Skeletons';
import { EmptyState } from '../components/shared/EmptyState';
import { useProject } from '../contexts';
import { useTranslation } from 'react-i18next';

export function SpecDetailPage() {
  const { specName, projectId } = useParams<{ specName: string; projectId: string }>();
  const basePath = projectId ? `/projects/${projectId}` : '/projects/default';
  const { currentProject, loading: projectLoading } = useProject();
  const { t } = useTranslation(['common', 'errors']);
  const projectReady = !projectId || currentProject?.id === projectId;
  const [spec, setSpec] = useState<SpecDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const describeError = useCallback((err: unknown) => {
    if (err instanceof APIError) {
      switch (err.status) {
        case 404:
          return t('specNotFound', { ns: 'errors' });
        case 400:
          return t('invalidInput', { ns: 'errors' });
        case 500:
          return t('unknownError', { ns: 'errors' });
        default:
          return t('loadingError', { ns: 'errors' });
      }
    }

    if (err instanceof Error && err.message.includes('Failed to fetch')) {
      return t('networkError', { ns: 'errors' });
    }

    return err instanceof Error ? err.message : t('unknownError', { ns: 'errors' });
  }, [t]);

  const loadSpec = useCallback(async () => {
    if (!specName || !projectReady || projectLoading) return;
    setLoading(true);
    try {
      const data = await api.getSpec(specName);
      setSpec(data);
      setError(null);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [describeError, projectLoading, projectReady, specName]);

  useEffect(() => {
    void loadSpec();
  }, [loadSpec, projectReady]);

  const subSpecs: SubSpec[] = useMemo(() => {
    const raw = (spec?.subSpecs as unknown) ?? (spec?.metadata?.sub_specs as unknown);
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const name = (entry as Record<string, unknown>).name;
        const content = (entry as Record<string, unknown>).content;
        if (typeof name !== 'string' || typeof content !== 'string') return null;
        return {
          name,
          content,
          file: typeof (entry as Record<string, unknown>).file === 'string' ? (entry as Record<string, unknown>).file as string : name,
          iconName: typeof (entry as Record<string, unknown>).iconName === 'string'
            ? (entry as Record<string, unknown>).iconName as string
            : typeof (entry as Record<string, unknown>).icon_name === 'string'
              ? (entry as Record<string, unknown>).icon_name as string
              : undefined,
          color: typeof (entry as Record<string, unknown>).color === 'string' ? (entry as Record<string, unknown>).color as string : undefined,
        } satisfies SubSpec;
      })
      .filter(Boolean) as SubSpec[];
  }, [spec]);

  const applySpecPatch = (updates: Partial<SpecDetail>) => {
    setSpec((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  if (loading) {
    return <SpecDetailSkeleton />;
  }

  if (error || !spec) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t('specDetail.state.unavailableTitle')}
        description={error || t('specDetail.state.unavailableDescription')}
        tone="error"
        actions={(
          <>
            <Link to={`${basePath}/specs`} className="inline-flex">
              <Button variant="outline" size="sm" className="gap-2">
                {t('specDetail.links.backToSpecs')}
              </Button>
            </Link>
            <Button variant="secondary" size="sm" className="gap-2" onClick={() => void loadSpec()}>
              <RefreshCcw className="h-4 w-4" />
              {t('actions.retry')}
            </Button>
            <a
              href="https://github.com/codervisor/lean-spec/issues"
              target="_blank"
              rel="noreferrer"
              className="inline-flex"
            >
              <Button variant="ghost" size="sm" className="gap-2">
                {t('specDetail.links.reportIssue')}
              </Button>
            </a>
          </>
        )}
      />
    );
  }

  const dependsOn = spec.dependsOn || [];
  const requiredBy = spec.requiredBy || [];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to={`${basePath}/specs`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('specDetail.links.backToSpecs')}
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {spec.specNumber && (
              <span className="font-mono text-xs text-muted-foreground">#{spec.specNumber.toString().padStart(3, '0')}</span>
            )}
            {spec.status && <StatusBadge status={spec.status} />}
            {spec.priority && <PriorityBadge priority={spec.priority} />}
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{spec.title || spec.name}</h1>
          <p className="text-sm text-muted-foreground break-words">{spec.name}</p>
          {spec.tags && spec.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {spec.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-1 bg-secondary rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {(dependsOn.length > 0 || requiredBy.length > 0) && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              {dependsOn.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('specDetail.dependencies.dependsOn')}</p>
                  <div className="flex flex-wrap gap-2">
                    {dependsOn.map((dep) => (
                      <Link key={dep} to={`${basePath}/specs/${dep}`} className="text-sm text-primary hover:underline">
                        {dep}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {requiredBy.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('specDetail.dependencies.requiredBy')}</p>
                  <div className="flex flex-wrap gap-2">
                    {requiredBy.map((dep) => (
                      <Link key={dep} to={`${basePath}/specs/${dep}`} className="text-sm text-primary hover:underline">
                        {dep}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <SubSpecTabs mainContent={spec.content} subSpecs={subSpecs} />
      </div>

      <div className="space-y-6">
        <div className="hidden lg:block sticky top-24">
          <TableOfContentsSidebar content={spec.content} />
        </div>
        <EditableMetadata spec={spec} onSpecChange={applySpecPatch} />
      </div>

      <TableOfContents content={spec.content} />
    </div>
  );
}
