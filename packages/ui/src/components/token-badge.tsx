import { Coins } from 'lucide-react';
import { tokenStatusClasses, formatCompactTokenCount, formatFullTokenCount, resolveTokenStatus } from '../lib/token-utils';
import { cn } from '@/library';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { useTranslation } from 'react-i18next';

interface TokenBadgeProps {
  count?: number;
  className?: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
  showIcon?: boolean;
}

export function TokenBadge({
  count: initialCount,
  className,
  size = 'sm',
  onClick,
  showIcon = true
}: TokenBadgeProps) {
  const { t } = useTranslation('common');
  const count = initialCount;

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
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
      role={onClick ? 'button' : 'status'}
      aria-label={`${fullCount} ${t('tokens.tokens')}, ${t('tokens.status', { status: t(`tokens.statusLabels.${status}`) })}`}
    >
      {showIcon && <Coins className={cn("shrink-0 opacity-70", size === 'sm' ? "h-3.5 w-3.5 mr-1.5" : "h-4 w-4 mr-2")} />}
      <span className="tabular-nums tracking-tight">{size === 'md' && !showIcon ? fullCount : compactCount}</span>
      {size === 'md' && <span className="ml-1 opacity-70 font-normal">{t('tokens.tokens')}</span>}
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
            <p className="font-semibold">{fullCount} {t('tokens.tokens')}</p>
            <p className="opacity-80 capitalize">{t('tokens.status', { status: t(`tokens.statusLabels.${status}`) })}</p>
            {onClick && <p className="mt-1 text-[10px] opacity-60">{t('tokens.clickForDetails')}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
