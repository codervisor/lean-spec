import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@leanspec/ui-components';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './Tooltip';
import type { ValidationStatus } from '../types/api';
import { useState, useEffect } from 'react';
import { getBackend } from '../lib/backend-adapter';

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
    className: 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20',
    label: 'Passed'
  },
  warn: {
    icon: AlertTriangle,
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    label: 'Warnings'
  },
  fail: {
    icon: XCircle,
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    label: 'Failed'
  }
};

export function ValidationBadge({
  status: initialStatus,
  projectId,
  specName,
  errorCount: initialErrorCount,
  className,
  size = 'sm',
  onClick
}: ValidationBadgeProps) {
  const [status, setStatus] = useState<ValidationStatus | undefined>(initialStatus);
  const [errorCount, setErrorCount] = useState<number | undefined>(initialErrorCount);
  const [loading, setLoading] = useState(false);
  const backend = getBackend();

  useEffect(() => {
    if (initialStatus !== undefined) {
      setStatus(initialStatus);
      setErrorCount(initialErrorCount);
    } else if (projectId && specName) {
      setLoading(true);
      backend.getSpecValidation(projectId, specName)
        .then(res => {
          setStatus(res.status);
          setErrorCount(res.issues.length);
        })
        .catch(() => {
          setStatus(undefined);
        })
        .finally(() => setLoading(false));
    }
  }, [initialStatus, initialErrorCount, projectId, specName]);

  if (loading) {
    return (
      <div className={cn("inline-flex items-center justify-center bg-muted/50 rounded text-muted-foreground", size === 'sm' ? "h-5 px-2" : "h-6 px-3", className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const config = statusConfig[status] || statusConfig.pass;
  const Icon = config.icon;
  const isPass = status === 'pass';

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
          e.stopPropagation();
          onClick();
        }
      }}
      role={onClick ? 'button' : 'status'}
      aria-label={`Validation: ${config.label}`}
    >
      <Icon className={cn("shrink-0", size === 'sm' ? "h-3.5 w-3.5" : "h-4 w-4", !isPass && errorCount ? "mr-1.5" : "")} />
      {!isPass && errorCount !== undefined && errorCount > 0 && (
        <span className="tabular-nums tracking-tight">{errorCount}</span>
      )}
      {size === 'md' && isPass && <span className="ml-1.5">Pass</span>}
      {size === 'md' && !isPass && <span className="ml-1 opacity-80 font-normal">{errorCount === 1 ? 'issue' : 'issues'}</span>}
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
            <p className="font-semibold">{config.label}</p>
            {!isPass && errorCount && <p className="opacity-80">{errorCount} issues found</p>}
            {onClick && <p className="mt-1 text-[10px] opacity-60">Click for details</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
