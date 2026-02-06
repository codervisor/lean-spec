import { cn } from '@leanspec/ui-components';
import { TOKEN_THRESHOLDS, getTokenProgressPercent, tokenProgressClasses } from '../../lib/token-utils';
import type { TokenStatus } from '../../types/api';

interface TokenProgressBarProps {
  current: number;
  max?: number;
  status: TokenStatus;
  className?: string;
}

export function TokenProgressBar({ current, max = TOKEN_THRESHOLDS.warning, status, className }: TokenProgressBarProps) {
  const percent = getTokenProgressPercent(current, max);

  return (
    <div className={cn('relative w-full h-2 bg-muted rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full transition-all duration-500 ease-out', tokenProgressClasses[status])}
        style={{ width: `${percent}%` }}
      />
      <span className="absolute -top-0.5 left-[40%] w-px h-3 bg-border" />
      <span className="absolute -top-0.5 left-[70%] w-px h-3 bg-border" />
      <span className="absolute -top-0.5 left-[100%] w-px h-3 bg-border" />
    </div>
  );
}
