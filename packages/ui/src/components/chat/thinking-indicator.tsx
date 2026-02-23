import { Shimmer } from '@/library';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ThinkingIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
}

export function ThinkingIndicator({
  className, text, ...props
}: ThinkingIndicatorProps) {
  const { t } = useTranslation('common');

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      <Shimmer
        className={cn('text-sm', className)}
        duration={1}
        spread={2}
        {...props}
      >
        {text || t('chat.thinking')}
      </Shimmer>
    </div>
  );
}
