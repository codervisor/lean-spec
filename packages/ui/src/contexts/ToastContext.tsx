import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { cn } from '@leanspec/ui-components';
import { nanoid } from 'nanoid';

export type ToastVariant = 'default' | 'success' | 'error';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: 'border-border bg-background text-foreground',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100',
  error: 'border-destructive/40 bg-destructive/5 text-destructive',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = nanoid();
    setToasts((prev) => [
      ...prev,
      {
        id,
        variant: 'default',
        durationMs: 4000,
        ...options,
      },
    ]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastPrimitive.Provider>
      <ToastContext.Provider value={value}>
        {children}
        {toasts.map((toastItem) => (
          <ToastPrimitive.Root
            key={toastItem.id}
            duration={toastItem.durationMs}
            onOpenChange={(open: boolean) => {
              if (!open) removeToast(toastItem.id);
            }}
            className={cn(
              'relative flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg',
              VARIANT_STYLES[toastItem.variant ?? 'default']
            )}
          >
            <div className="flex-1 space-y-1">
              <ToastPrimitive.Title className="text-sm font-semibold">
                {toastItem.title}
              </ToastPrimitive.Title>
              {toastItem.description && (
                <ToastPrimitive.Description className="text-xs text-muted-foreground">
                  {toastItem.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close asChild>
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={t('actions.close')}
                onClick={() => removeToast(toastItem.id)}
              >
                <X className="h-4 w-4" />
              </button>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-50 flex w-[360px] max-w-[90vw] flex-col gap-2 outline-none" />
      </ToastContext.Provider>
    </ToastPrimitive.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
