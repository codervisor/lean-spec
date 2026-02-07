import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link2, Network, GitBranch, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';
import type { Spec, SpecDetail } from '../../types/api';
import { api } from '../../lib/api';
import { SpecSearchPicker } from './SpecSearchPicker';
import { RelationshipSection } from './RelationshipSection';

type RelationshipSpec = {
  specName: string;
  title?: string | null;
  specNumber?: number | null;
};

interface RelationshipsEditorProps {
  spec: SpecDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  basePath: string;
  disabled?: boolean;
  onUpdated: () => void;
}

export function RelationshipsEditor({
  spec,
  open,
  onOpenChange,
  basePath,
  disabled,
  onUpdated,
}: RelationshipsEditorProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(false);

  const specMap = useMemo(() => new Map(specs.map((s) => [s.specName, s])), [specs]);

  const loadSpecs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getSpecs();
      setSpecs(data);
    } catch {
      setSpecs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadSpecs();
    }
  }, [loadSpecs, open]);

  const confirmRemove = useCallback(
    (label: string) => {
      return window.confirm(t('relationships.confirmRemove', { label }));
    },
    [t]
  );

  const handleNavigate = useCallback(
    (specName: string) => {
      navigate(`${basePath}/specs/${specName}`);
      onOpenChange(false);
    },
    [basePath, navigate, onOpenChange]
  );

  const handleUpdate = useCallback(async (action: () => Promise<void>) => {
    await action();
    onUpdated();
  }, [onUpdated]);

  const resolveSpec = useCallback(
    (specName: string): RelationshipSpec => {
      const found = specMap.get(specName);
      if (found) {
        return {
          specName: found.specName,
          title: found.title,
          specNumber: found.specNumber,
        };
      }
      return { specName };
    },
    [specMap]
  );

  const parentSpec = spec.parent ? resolveSpec(spec.parent) : null;
  const childrenSpecs = (spec.children || []).map(resolveSpec);
  const dependsOnSpecs = (spec.dependsOn || []).map(resolveSpec);
  const requiredBySpecs = (spec.requiredBy || []).map(resolveSpec);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(720px,95vw)] max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('relationships.title')}</DialogTitle>
          <DialogDescription>{t('relationships.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Network className="h-4 w-4" />
              {t('relationships.sections.hierarchy')}
            </div>

            <RelationshipSection
              title={t('relationships.parent')}
              items={parentSpec ? [parentSpec] : []}
              emptyLabel={t('relationships.empty.parent')}
              canEdit={!disabled}
              onNavigate={handleNavigate}
              onRemove={parentSpec && !disabled ? () => {
                if (!confirmRemove(parentSpec.title || parentSpec.specName)) return;
                void handleUpdate(() => api.updateSpec(spec.specName, { parent: null }));
              } : undefined}
              actions={!disabled ? (
                <SpecSearchPicker
                  specs={specs}
                  onSelect={(selected) => {
                    void handleUpdate(() => api.updateSpec(spec.specName, { parent: selected.specName }));
                  }}
                  disabled={loading || disabled}
                  excludeSpecNames={[spec.specName]}
                  placeholder={t('relationships.actions.setParent')}
                  emptyLabel={t('relationships.empty.noSpecs')}
                />
              ) : undefined}
            />

            <RelationshipSection
              title={t('relationships.children')}
              items={childrenSpecs}
              emptyLabel={t('relationships.empty.children')}
              canEdit={!disabled}
              onNavigate={handleNavigate}
              onRemove={!disabled ? (childName) => {
                const child = resolveSpec(childName);
                if (!confirmRemove(child.title || child.specName)) return;
                void handleUpdate(() => api.updateSpec(childName, { parent: null }));
              } : undefined}
              actions={!disabled ? (
                <SpecSearchPicker
                  specs={specs}
                  onSelect={(selected) => {
                    if (selected.specName === spec.specName) return;
                    void handleUpdate(() => api.updateSpec(selected.specName, { parent: spec.specName }));
                  }}
                  disabled={loading || disabled}
                  excludeSpecNames={[spec.specName, ...(spec.children || [])]}
                  placeholder={t('relationships.actions.addChild')}
                  emptyLabel={t('relationships.empty.noSpecs')}
                />
              ) : undefined}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <GitBranch className="h-4 w-4" />
              {t('relationships.sections.dependencies')}
            </div>

            <RelationshipSection
              title={t('relationships.dependsOn')}
              items={dependsOnSpecs}
              emptyLabel={t('relationships.empty.dependsOn')}
              canEdit={!disabled}
              onNavigate={handleNavigate}
              onRemove={!disabled ? (depName) => {
                const dep = resolveSpec(depName);
                if (!confirmRemove(dep.title || dep.specName)) return;
                void handleUpdate(() => api.updateSpec(spec.specName, { removeDependsOn: [depName] }));
              } : undefined}
              actions={!disabled ? (
                <SpecSearchPicker
                  specs={specs}
                  onSelect={(selected) => {
                    if (selected.specName === spec.specName) return;
                    void handleUpdate(() => api.updateSpec(spec.specName, { addDependsOn: [selected.specName] }));
                  }}
                  disabled={loading || disabled}
                  excludeSpecNames={[spec.specName, ...(spec.dependsOn || [])]}
                  placeholder={t('relationships.actions.addDependsOn')}
                  emptyLabel={t('relationships.empty.noSpecs')}
                />
              ) : undefined}
            />

            <RelationshipSection
              title={t('relationships.requiredBy')}
              items={requiredBySpecs}
              emptyLabel={t('relationships.empty.requiredBy')}
              canEdit={!disabled}
              onNavigate={handleNavigate}
              onRemove={!disabled ? (reqName) => {
                const req = resolveSpec(reqName);
                if (!confirmRemove(req.title || req.specName)) return;
                void handleUpdate(() => api.updateSpec(reqName, { removeDependsOn: [spec.specName] }));
              } : undefined}
              actions={!disabled ? (
                <SpecSearchPicker
                  specs={specs}
                  onSelect={(selected) => {
                    if (selected.specName === spec.specName) return;
                    void handleUpdate(() => api.updateSpec(selected.specName, { addDependsOn: [spec.specName] }));
                  }}
                  disabled={loading || disabled}
                  excludeSpecNames={[spec.specName, ...(spec.requiredBy || [])]}
                  placeholder={t('relationships.actions.addRequiredBy')}
                  emptyLabel={t('relationships.empty.noSpecs')}
                />
              ) : undefined}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => navigate(`${basePath}/specs?view=board&groupByParent=1`)}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              {t('relationships.actions.viewHierarchy')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => navigate(`${basePath}/dependencies?spec=${spec.specNumber || spec.id}`)}
              className="gap-2"
            >
              <Link2 className="h-4 w-4" />
              {t('relationships.actions.viewDependencies')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
