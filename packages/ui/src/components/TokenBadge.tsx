import { FileText, Loader2 } from 'lucide-react';
import { tokenStatusClasses, formatCompactTokenCount, formatFullTokenCount, resolveTokenStatus } from '../lib/token-utils';
import { cn } from '@leanspec/ui-components';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './Tooltip';
import { useState, useEffect } from 'react';
import { getBackend } from '../lib/backend-adapter';

interface TokenBadgeProps {
  count?: number;
  projectId?: string;
  specName?: string;
  className?: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
  showIcon?: boolean;
}

export function TokenBadge({
  count: initialCount,
  projectId,
  specName,
  className,
  size = 'sm',
  onClick,
  showIcon = true
}: TokenBadgeProps) {
  const [count, setCount] = useState<number | undefined>(initialCount);
  const [loading, setLoading] = useState(false);
  const backend = getBackend();

  useEffect(() => {
    if (initialCount !== undefined) {
      setCount(initialCount);
    } else if (projectId && specName) {
      setLoading(true);
      backend.getSpecTokens(projectId, specName)
        .then(res => setCount(res.tokenCount))
        .catch(() => setCount(undefined))
        .finally(() => setLoading(false));
    }
  }, [initialCount, projectId, specName]);

  if (loading) {
    return (
      <div className={cn("inline-flex items-center justify-center bg-muted/50 rounded text-muted-foreground", size === 'sm' ? "h-5 px-2" : "h-6 px-3", className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
      </div>
    );
  }

  if (count === undefined) {
    return null;
  }

  const status = resolveTokenStatus(count);
  const colorClass = tokenStatusClasses[status];
  const compactCount = formatCompactTokenCount(count);
  const fullCount = formatFullTokenCount(count);

  const content = (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded transition-all duration-200 border border-transparent',
        size === 'sm' ? 'h-5 px-2 text-xs font-medium' : 'h-6 px-3 text-sm font-medium',
        colorClass,
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
      aria-label={`${fullCount} tokens, status: ${status}`}
    >
      {showIcon && <FileText className={cn("shrink-0 opacity-70", size === 'sm' ? "h-3.5 w-3.5 mr-1.5" : "h-4 w-4 mr-2")} />}
      <span className="tabular-nums tracking-tight">{size === 'md' && !showIcon ? fullCount : compactCount}</span>
      {size === 'md' && <span className="ml-1 opacity-70 font-normal">tokens</span>}
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
            <p className="font-semibold">{fullCount} tokens</p>
            <p className="opacity-80 capitalize">Status: {status}</p>
            {onClick && <p className="mt-1 text-[10px] opacity-60">Click for details</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
