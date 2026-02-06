import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button, cn } from '@/library';
import type { SpecValidationResponse } from '../../types/api';
import { CheckCircle2, AlertTriangle, XCircle, Info, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ValidationDialogProps {
  open: boolean;
  onClose: () => void;
  specName: string;
  data: SpecValidationResponse | null;
  loading?: boolean;
}

export function ValidationDialog({ open, onClose, specName, data, loading }: ValidationDialogProps) {
  const { t } = useTranslation('common');

  if (loading || !data) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
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
    );
  }

  const { status, errors } = data;
  // If pass but we have warnings/info messages (errors array not empty), treat as needing list view
  const isPass = status === 'pass' && (!errors || errors.length === 0);
  const headerIcon = status === 'fail' ? XCircle : AlertTriangle;
  const HeaderIcon = isPass ? CheckCircle2 : headerIcon;

  const severityStyles = {
    error: {
      icon: XCircle,
      className: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
      iconClassName: 'text-red-600',
    },
    warning: {
      icon: AlertTriangle,
      className: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800',
      iconClassName: 'text-orange-600',
    },
    info: {
      icon: Info,
      className: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800',
      iconClassName: 'text-blue-600',
    },
  } as const;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeaderIcon className={isPass ? 'text-green-600' : status === 'fail' ? 'text-red-600' : 'text-orange-600'} />
            {t('validation.dialog.title', { specName })}
          </DialogTitle>
          <DialogDescription>
            {isPass
              ? t('validation.dialog.passDescription')
              : t('validation.dialog.errorDescription', { count: errors.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isPass ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="h-16 w-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-medium">{t('validation.dialog.passTitle')}</h3>
              <p className="text-muted-foreground max-w-xs">{t('validation.dialog.passBody')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {errors.map((validationError, idx) => {
                const severity = validationError.severity === 'error' ? 'error' : validationError.severity === 'info' ? 'info' : 'warning';
                const config = severityStyles[severity];
                const ErrorIcon = config.icon;

                return (
                  <div key={idx} className={cn("p-3 rounded-lg border text-sm space-y-1", config.className)}>
                    <div className="flex items-start gap-2">
                      <ErrorIcon className={cn("h-4 w-4 mt-0.5 shrink-0", config.iconClassName)} />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{validationError.message}</p>
                        {validationError.line && (
                          <p className="text-xs opacity-70 mt-1">{t('validation.dialog.line', { line: validationError.line })}</p>
                        )}
                        {validationError.suggestion && (
                          <div className="mt-2 text-xs bg-background/50 p-2 rounded border border-border/50">
                            <span className="font-semibold block mb-1">{t('validation.dialog.suggestion')}</span>
                            {validationError.suggestion}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{t('actions.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
