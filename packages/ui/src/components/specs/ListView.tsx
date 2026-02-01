import { Link } from 'react-router-dom';
import type { Spec, SpecTokenResponse, SpecValidationResponse } from '../../types/api';
import { StatusBadge } from '../StatusBadge';
import { PriorityBadge } from '../PriorityBadge';
import { useTranslation } from 'react-i18next';
import { HierarchyList } from './HierarchyList';
import { TokenBadge } from '../TokenBadge';
import { ValidationBadge } from '../ValidationBadge';
import { TokenDetailsDialog } from './TokenDetailsDialog';
import { ValidationDialog } from './ValidationDialog';
import { memo, useCallback, useEffect, useState } from 'react';
import { getBackend } from '../../lib/backend-adapter';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@leanspec/ui-components';
import { Loader2 } from 'lucide-react';

interface SpecListItemProps {
  spec: Spec;
  basePath: string;
  onTokenClick: (specName: string) => void;
  onValidationClick: (specName: string) => void;
}

// Memoized spec item to prevent re-renders when dialog state changes
const SpecListItem = memo(function SpecListItem({
  spec,
  basePath,
  onTokenClick,
  onValidationClick,
}: SpecListItemProps) {
  return (
    <Link
      to={`${basePath}/specs/${spec.specName}`}
      className="block p-4 border rounded-lg hover:bg-secondary/50 transition-colors bg-background"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
              #{spec.specNumber}
            </span>
            <h3 className="font-medium truncate">{spec.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground truncate">{spec.specName}</p>
        </div>
        <div className="flex gap-2 items-center flex-shrink-0 flex-wrap justify-end">
          {spec.status && <StatusBadge status={spec.status} />}
          {spec.priority && <PriorityBadge priority={spec.priority} />}
          <TokenBadge
            count={spec.tokenCount}
            size="sm"
            onClick={() => onTokenClick(spec.specName)}
          />
          <ValidationBadge
            status={spec.validationStatus}
            size="sm"
            onClick={() => onValidationClick(spec.specName)}
          />
        </div>
      </div>
      {spec.tags && spec.tags.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {spec.tags.map((tag: string) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-secondary rounded text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
});

interface ListViewProps {
  specs: Spec[];
  basePath?: string;
  groupByParent?: boolean;
  projectId?: string;
}

export function ListView({ specs, basePath = '/projects', groupByParent = false, projectId }: ListViewProps) {
  const { t } = useTranslation('common');
  const backend = getBackend();
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [tokenDialogLoading, setTokenDialogLoading] = useState(false);
  const [tokenDialogData, setTokenDialogData] = useState<SpecTokenResponse | null>(null);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationDialogLoading, setValidationDialogLoading] = useState(false);
  const [validationDialogData, setValidationDialogData] = useState<SpecValidationResponse | null>(null);
  const [activeSpecName, setActiveSpecName] = useState<string | null>(null);

  const closeTokenDialog = useCallback(() => {
    setTokenDialogOpen(false);
    setTokenDialogLoading(false);
    setTokenDialogData(null);
  }, []);

  const closeValidationDialog = useCallback(() => {
    setValidationDialogOpen(false);
    setValidationDialogLoading(false);
    setValidationDialogData(null);
  }, []);

  // Stable callbacks for spec item clicks
  const handleTokenClick = useCallback((specName: string) => {
    if (!projectId) return;
    setActiveSpecName(specName);
    setTokenDialogOpen(true);
  }, [projectId]);

  const handleValidationClick = useCallback((specName: string) => {
    if (!projectId) return;
    setActiveSpecName(specName);
    setValidationDialogOpen(true);
  }, [projectId]);

  useEffect(() => {
    if (!tokenDialogOpen || !activeSpecName || !projectId) return;
    setTokenDialogLoading(true);
    backend.getSpecTokens(projectId, activeSpecName)
      .then((data) => setTokenDialogData(data))
      .catch(() => setTokenDialogData(null))
      .finally(() => setTokenDialogLoading(false));
  }, [activeSpecName, backend, projectId, tokenDialogOpen]);

  useEffect(() => {
    if (!validationDialogOpen || !activeSpecName || !projectId) return;
    setValidationDialogLoading(true);
    backend.getSpecValidation(projectId, activeSpecName)
      .then((data) => setValidationDialogData(data))
      .catch(() => setValidationDialogData(null))
      .finally(() => setValidationDialogLoading(false));
  }, [activeSpecName, backend, projectId, validationDialogOpen]);

  if (specs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg bg-secondary/10">
        {t('specsPage.list.empty')}
      </div>
    );
  }

  if (groupByParent) {
    return <HierarchyList specs={specs} basePath={basePath} />;
  }

  return (
    <>
      <div className="h-full overflow-y-auto space-y-2">
        {specs.map((spec) => (
          <SpecListItem
            key={spec.specName}
            spec={spec}
            basePath={basePath}
            onTokenClick={handleTokenClick}
            onValidationClick={handleValidationClick}
          />
        ))}
      </div>

      {activeSpecName && tokenDialogOpen && tokenDialogData && (
        <TokenDetailsDialog
          open={tokenDialogOpen}
          onClose={closeTokenDialog}
          specName={activeSpecName}
          data={tokenDialogData}
        />
      )}

      {activeSpecName && tokenDialogOpen && tokenDialogLoading && !tokenDialogData && (
        <Dialog open={tokenDialogOpen} onOpenChange={closeTokenDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('actions.loading')}</DialogTitle>
              <DialogDescription>{t('tokens.detailedBreakdown')}</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {activeSpecName && validationDialogOpen && validationDialogData && (
        <ValidationDialog
          open={validationDialogOpen}
          onClose={closeValidationDialog}
          specName={activeSpecName}
          data={validationDialogData}
        />
      )}

      {activeSpecName && validationDialogOpen && validationDialogLoading && !validationDialogData && (
        <Dialog open={validationDialogOpen} onOpenChange={closeValidationDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('actions.loading')}</DialogTitle>
              <DialogDescription>{t('validation.dialog.loading')}</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
