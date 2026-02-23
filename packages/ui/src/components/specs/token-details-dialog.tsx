import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button } from '@/library';
import { formatFullTokenCount, resolveTokenStatus, TOKEN_THRESHOLDS } from '../../lib/token-utils';
import { TokenProgressBar } from '../token-progress-bar';
import type { SpecTokenResponse } from '../../types/api';
import { FileText, Code, AlignLeft, ListChecks, FileCode2, Heading2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TokenDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  specName: string;
  data: SpecTokenResponse | null;
  loading?: boolean;
}

export function TokenDetailsDialog({ open, onClose, specName, data, loading }: TokenDetailsDialogProps) {
  const { t } = useTranslation('common');

  if (loading || !data) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
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
    );
  }

  const { tokenCount, tokenBreakdown } = data;
  const status = resolveTokenStatus(tokenCount);
  const formattedCount = formatFullTokenCount(tokenCount);

  const frontmatterPercent = Math.round((tokenBreakdown.frontmatter / tokenCount) * 100) || 0;

  // Detailed breakdown
  const detailed = tokenBreakdown.detailed;
  const prosePercent = Math.round((detailed.prose / tokenCount) * 100) || 0;
  const codePercent = Math.round((detailed.codeBlocks / tokenCount) * 100) || 0;
  const checklistPercent = Math.round((detailed.checklists / tokenCount) * 100) || 0;

  const getPerformanceMessage = () => {
    switch (status) {
      case 'optimal': return t('tokens.performance.optimal');
      case 'good': return t('tokens.performance.good');
      case 'warning': return t('tokens.performance.warning');
      case 'critical': return t('tokens.performance.critical');
      default: return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('tokens.contextEconomy')}
          </DialogTitle>
          <DialogDescription className="text-base font-medium text-foreground">
            {specName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2">
          <div className="space-y-6 pb-4">
            {/* Hero Section */}
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold tracking-tight">
                {formattedCount}
                <span className="text-base font-normal text-muted-foreground ml-2">{t('tokens.tokens')}</span>
              </div>
              <p className={`text-sm font-medium capitalize text-${status === 'critical' ? 'red' : status === 'warning' ? 'orange' : status === 'good' ? 'blue' : 'green'}-600`}>
                {t('tokens.status', { status: t(`tokens.statusLabels.${status}`) })}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('tokens.progressTicks.zero')}</span>
                <span>{t('tokens.progressTicks.twoK')}</span>
                <span>{t('tokens.progressTicks.threePointFiveK')}</span>
                <span>{t('tokens.progressTicks.fiveKPlus')}</span>
              </div>
              <TokenProgressBar current={tokenCount} max={Math.max(tokenCount, TOKEN_THRESHOLDS.warning)} />
              <p className="text-xs text-muted-foreground text-center pt-1">
                {getPerformanceMessage()}
              </p>
            </div>

            {/* Content Composition */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">{t('tokens.composition')}</h4>
              <div className="space-y-3">
                {/* Frontmatter */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Code className="h-3.5 w-3.5" /> {t('tokens.frontmatter')}
                    </span>
                    <span>{formatFullTokenCount(tokenBreakdown.frontmatter)} ({frontmatterPercent}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500" style={{ width: `${frontmatterPercent}%` }} />
                  </div>
                </div>

                {/* Prose */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <AlignLeft className="h-3.5 w-3.5" /> {t('tokens.prose')}
                    </span>
                    <span>{formatFullTokenCount(detailed.prose)} ({prosePercent}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-slate-500" style={{ width: `${prosePercent}%` }} />
                  </div>
                </div>

                {/* Code Blocks */}
                {detailed.codeBlocks > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <FileCode2 className="h-3.5 w-3.5" /> {t('tokens.codeBlocks')}
                      </span>
                      <span>{formatFullTokenCount(detailed.codeBlocks)} ({codePercent}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${codePercent}%` }} />
                    </div>
                  </div>
                )}

                {/* Checklists */}
                {detailed.checklists > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <ListChecks className="h-3.5 w-3.5" /> {t('tokens.checklists')}
                      </span>
                      <span>{formatFullTokenCount(detailed.checklists)} ({checklistPercent}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${checklistPercent}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section Breakdown */}
            {detailed.sections.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Heading2 className="h-4 w-4" />
                  {t('tokens.sectionBreakdown')}
                </h4>
                <div className="space-y-2">
                  {detailed.sections.map((section, idx) => {
                    const sectionPercent = Math.round((section.tokens / tokenCount) * 100) || 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground truncate max-w-[200px]" title={section.heading}>
                            {section.heading}
                          </span>
                          <span className="text-xs font-mono">{formatFullTokenCount(section.tokens)} ({sectionPercent}%)</span>
                        </div>
                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/60" style={{ width: `${sectionPercent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>{t('actions.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
