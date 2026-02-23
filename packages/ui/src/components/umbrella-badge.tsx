import { Layers } from 'lucide-react';
import { cn, TooltipProvider } from '@/library';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

interface UmbrellaBadgeProps {
  className?: string;
  count?: number;
  iconOnly?: boolean;
}

export function UmbrellaBadge({ className, count, iconOnly = false }: UmbrellaBadgeProps) {
  const { t } = useTranslation('common');

  if (iconOnly) {
    return (
      <Layers className={cn("h-4 w-4 text-primary", className)} />
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium border border-primary/20 transition-colors",
              "bg-primary/10 text-primary",
              className
            )}
          >
            <Layers className="h-3 w-3" />
            <span>{t('specs.hierarchy.umbrella')}</span>
            {count !== undefined && count > 0 && (
              <span className="ml-0.5 opacity-70">({count})</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {t('specs.hierarchy.umbrella')}
          {count !== undefined && count > 0 ? ` (${count} children)` : ''}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
