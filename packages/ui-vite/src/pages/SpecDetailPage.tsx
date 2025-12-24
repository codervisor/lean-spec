import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, Skeleton } from '@leanspec/ui-components';
import { api, type SpecDetail } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { SubSpecTabs, type SubSpec } from '../components/spec-detail/SubSpecTabs';
import { TableOfContents, TableOfContentsSidebar } from '../components/spec-detail/TableOfContents';
import { EditableMetadata } from '../components/spec-detail/EditableMetadata';

export function SpecDetailPage() {
  const { specName } = useParams<{ specName: string }>();
  const [spec, setSpec] = useState<SpecDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSpec = async () => {
      if (!specName) return;
      setLoading(true);
      try {
        const data = await api.getSpec(specName);
        setSpec(data);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load spec';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadSpec();
  }, [specName]);

  const subSpecs: SubSpec[] = useMemo(() => {
    const raw = spec?.metadata?.sub_specs as unknown;
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
          iconName: typeof (entry as Record<string, unknown>).iconName === 'string' ? (entry as Record<string, unknown>).iconName as string : undefined,
          color: typeof (entry as Record<string, unknown>).color === 'string' ? (entry as Record<string, unknown>).color as string : undefined,
        } satisfies SubSpec;
      })
      .filter(Boolean) as SubSpec[];
  }, [spec]);

  const applySpecPatch = (updates: Partial<SpecDetail>) => {
    setSpec((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !spec) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive">Error loading spec: {error || 'Not found'}</div>
        <Link to="/specs" className="text-sm text-primary hover:underline mt-4 inline-block">
          Back to specs
        </Link>
      </div>
    );
  }

  const dependsOn = spec.dependsOn || [];
  const requiredBy = spec.requiredBy || [];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/specs"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to specs
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
                  <p className="text-sm font-medium">Depends on</p>
                  <div className="flex flex-wrap gap-2">
                    {dependsOn.map((dep) => (
                      <Link key={dep} to={`/specs/${dep}`} className="text-sm text-primary hover:underline">
                        {dep}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {requiredBy.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Required by</p>
                  <div className="flex flex-wrap gap-2">
                    {requiredBy.map((dep) => (
                      <Link key={dep} to={`/specs/${dep}`} className="text-sm text-primary hover:underline">
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
