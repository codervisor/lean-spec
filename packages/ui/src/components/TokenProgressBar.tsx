import { TOKEN_THRESHOLDS, tokenProgressClasses, getTokenProgressPercent, resolveTokenStatus } from '../lib/token-utils';
import { cn } from '../lib/utils';

interface TokenProgressBarProps {
  current: number;
  max?: number;
  className?: string;
  showBenchmarks?: boolean;
}

export function TokenProgressBar({ 
  current, 
  max = TOKEN_THRESHOLDS.warning,
  className,
  showBenchmarks = true
}: TokenProgressBarProps) {
  const percent = getTokenProgressPercent(current, max);
  const status = resolveTokenStatus(current);
  const colorClass = tokenProgressClasses[status];
  
  // Calculate marker positions relative to max
  const optimalPos = (TOKEN_THRESHOLDS.optimal / max) * 100;
  const goodPos = (TOKEN_THRESHOLDS.good / max) * 100;
  // Warning pos is 100% if max is warning threshold

  return (
    <div className={cn("relative w-full h-3", className)}>
      <div className="w-full h-full bg-muted/50 rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-500 ease-out", colorClass)} 
          style={{ width: `${percent}%` }}
        />
      </div>
      
      {showBenchmarks && (
        <>
          {optimalPos < 100 && (
            <div 
              className="absolute top-0 bottom-0 w-px bg-background/50 z-10" 
              style={{ left: `${optimalPos}%` }}
              title="Optimal Limit (2k)"
            />
          )}
          {goodPos < 100 && (
            <div 
              className="absolute top-0 bottom-0 w-px bg-background/50 z-10" 
              style={{ left: `${goodPos}%` }}
              title="Good Limit (3.5k)"
            />
          )}
        </>
      )}
    </div>
  );
}
