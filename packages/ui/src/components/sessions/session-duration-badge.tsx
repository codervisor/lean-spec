import { Timer } from 'lucide-react';
import { cn } from '@/library';

interface SessionDurationBadgeProps {
  duration: string;
  /** 'pill' renders a muted rounded badge (sidebar style); 'text' renders inline text (list style) */
  variant?: 'pill' | 'text';
  className?: string;
}

export function SessionDurationBadge({ duration, variant = 'text', className }: SessionDurationBadgeProps) {
  if (variant === 'pill') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 h-5 px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-muted text-muted-foreground shrink-0',
          className
        )}
      >
        <Timer className="h-3 w-3" />
        {duration}
      </span>
    );
  }

  return (
    <span className={cn('shrink-0 flex items-center gap-1 text-xs text-muted-foreground', className)}>
      <Timer className="h-3 w-3" />
      {duration}
    </span>
  );
}
