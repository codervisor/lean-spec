import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@leanspec/ui-components';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './Tooltip';
import type { ValidationStatus } from '../types/api';
import { useTranslation } from 'react-i18next';

interface ValidationBadgeProps {
  status?: ValidationStatus;
  projectId?: string;
  specName?: string;
  errorCount?: number;
  className?: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

const statusConfig = {
  pass: {
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    labelKey: 'validation.status.pass'
  },
  warn: {
    icon: AlertTriangle,
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    labelKey: 'validation.status.warn'
  },
  fail: {
    icon: XCircle,
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    labelKey: 'validation.status.fail'
  }
};

export function ValidationBadge({
  status: initialStatus,
  errorCount: initialErrorCount,
  className,
  size = 'sm',
  onClick
}: ValidationBadgeProps) {
  const { t } = useTranslation('common');
  const status = initialStatus;
  const errorCount = initialErrorCount;

  if (!status) {
    return null;
  }

  const config = statusConfig[status] || statusConfig.pass;
  const Icon = config.icon;
  const isPass = status === 'pass';
  const label = t(config.labelKey);

  const content = (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded transition-all duration-200 border border-transparent',
        size === 'sm' ? 'h-5 px-2 text-xs font-medium' : 'h-6 px-3 text-sm font-medium',
        config.className,
        onClick && 'cursor-pointer hover:brightness-95 dark:hover:brightness-110 active:scale-95',
        className
      )}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
      role={onClick ? 'button' : 'status'}
      aria-label={t('validation.validationLabel', { label })}
    >
      <Icon className={cn("shrink-0", size === 'sm' ? "h-3.5 w-3.5" : "h-4 w-4", !isPass && errorCount ? "mr-1.5" : "")} />
      {!isPass && errorCount !== undefined && errorCount > 0 && (
        <span className="tabular-nums tracking-tight">{errorCount}</span>
      )}
      {size === 'md' && isPass && <span className="ml-1.5">{t('validation.passLabel')}</span>}
      {size === 'md' && !isPass && <span className="ml-1 opacity-80 font-normal">{errorCount === 1 ? t('validation.error') : t('validation.errors')}</span>}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="text-xs">
            <p className="font-semibold">{label}</p>
            {!isPass && errorCount && <p className="opacity-80">{t('validation.errorsFound', { count: errorCount })}</p>}
            {onClick && <p className="mt-1 text-[10px] opacity-60">{t('validation.clickForDetails')}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
