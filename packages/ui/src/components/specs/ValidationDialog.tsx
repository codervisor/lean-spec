import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button, cn } from '@leanspec/ui-components';
import type { SpecValidationResponse } from '../../types/api';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface ValidationDialogProps {
  open: boolean;
  onClose: () => void;
  specName: string;
  data: SpecValidationResponse;
}

export function ValidationDialog({ open, onClose, specName, data }: ValidationDialogProps) {
  const { status, issues } = data;
  const isPass = status === 'pass';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPass ? <CheckCircle2 className="text-green-600" /> : <AlertTriangle className="text-orange-600" />}
            Validation: {specName}
          </DialogTitle>
          <DialogDescription>
            {isPass
              ? "All quality checks passed successfully."
              : `Found ${issues.length} issue${issues.length === 1 ? '' : 's'} that require attention.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isPass ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="h-16 w-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-medium">Spec Validated</h3>
              <p className="text-muted-foreground max-w-xs">
                This spec meets all LeanSpec quality standards and structure requirements.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {issues.map((issue, idx) => (
                <div key={idx} className={cn(
                  "p-3 rounded-lg border text-sm space-y-1",
                  issue.severity === 'error'
                    ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
                    : "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800"
                )}>
                  <div className="flex items-start gap-2">
                    {issue.severity === 'error'
                      ? <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      : <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                    }
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{issue.message}</p>
                      {issue.line && (
                        <p className="text-xs opacity-70 mt-1">Line {issue.line}</p>
                      )}
                      {issue.suggestion && (
                        <div className="mt-2 text-xs bg-background/50 p-2 rounded border border-border/50">
                          <span className="font-semibold block mb-1">Suggestion:</span>
                          {issue.suggestion}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
