import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button } from '@leanspec/ui-components';
import { formatFullTokenCount, resolveTokenStatus, TOKEN_THRESHOLDS } from '../../lib/token-utils';
import { TokenProgressBar } from '../TokenProgressBar';
import type { SpecTokenResponse } from '../../types/api';
import { FileText, Code, AlignLeft } from 'lucide-react';

interface TokenDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  specName: string;
  data: SpecTokenResponse;
}

export function TokenDetailsDialog({ open, onClose, specName, data }: TokenDetailsDialogProps) {
  const { tokenCount, tokenBreakdown } = data;
  const status = resolveTokenStatus(tokenCount);
  const formattedCount = formatFullTokenCount(tokenCount);

  const prosePercent = Math.round((tokenBreakdown.content / tokenCount) * 100) || 0;
  const frontmatterPercent = Math.round((tokenBreakdown.frontmatter / tokenCount) * 100) || 0;

  // Estimate optimal (assumed small structure overhead)

  const getPerformanceMessage = () => {
    switch (status) {
      case 'optimal': return "Excellent! This spec is highly efficient for AI context.";
      case 'good': return "Good size. Well within comfortable limits for most models.";
      case 'warning': return "Getting large. Consider splitting if functionality grows.";
      case 'critical': return "Too large. This spec consumes significant context and may degrade AI performance.";
      default: return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Context Economy: {specName}
          </DialogTitle>
          <DialogDescription>
            Detailed breakdown of token usage for this spec.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Hero Section */}
          <div className="text-center space-y-2">
            <div className="text-4xl font-bold tracking-tight">
              {formattedCount}
              <span className="text-base font-normal text-muted-foreground ml-2">tokens</span>
            </div>
            <p className={`text-sm font-medium capitalize text-${status === 'critical' ? 'red' : status === 'warning' ? 'orange' : status === 'good' ? 'blue' : 'green'}-600`}>
              Status: {status}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>2k</span>
              <span>3.5k</span>
              <span>5k+</span>
            </div>
            <TokenProgressBar current={tokenCount} max={Math.max(tokenCount, TOKEN_THRESHOLDS.warning)} />
            <p className="text-xs text-muted-foreground text-center pt-1">
              {getPerformanceMessage()}
            </p>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Composition</h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <AlignLeft className="h-3.5 w-3.5" /> Prose & Content
                  </span>
                  <span>{formatFullTokenCount(tokenBreakdown.content)} ({prosePercent}%)</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-slate-500" style={{ width: `${prosePercent}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Code className="h-3.5 w-3.5" /> Frontmatter
                  </span>
                  <span>{formatFullTokenCount(tokenBreakdown.frontmatter)} ({frontmatterPercent}%)</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400" style={{ width: `${frontmatterPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
