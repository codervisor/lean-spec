/**
 * Timeline component to visualize spec evolution
 */

import { formatDate, formatRelativeTime } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  label: string;
  date: Date | string | number | null | undefined;
  isCurrent?: boolean;
}

interface SpecTimelineProps {
  createdAt: Date | string | number | null | undefined;
  updatedAt: Date | string | number | null | undefined;
  completedAt?: Date | string | number | null | undefined;
  status: string;
  className?: string;
}

export function SpecTimeline({ 
  createdAt, 
  updatedAt, 
  completedAt,
  status,
  className 
}: SpecTimelineProps) {
  const events: TimelineEvent[] = [];

  // Always include created
  if (createdAt) {
    events.push({
      label: 'Created',
      date: createdAt,
      isCurrent: status === 'planned',
    });
  }

  // Add in-progress if status is in-progress or later
  if (status === 'in-progress' || status === 'complete' || status === 'archived') {
    events.push({
      label: 'Started',
      date: updatedAt || createdAt,
      isCurrent: status === 'in-progress',
    });
  }

  // Add completed if status is complete
  if (completedAt || status === 'complete') {
    events.push({
      label: 'Completed',
      date: completedAt || updatedAt,
      isCurrent: status === 'complete',
    });
  }

  // Add archived if status is archived
  if (status === 'archived') {
    events.push({
      label: 'Archived',
      date: updatedAt,
      isCurrent: true,
    });
  }

  if (events.length === 0) return null;

  return (
    <div className={cn('relative py-8', className)}>
      {/* Connection line */}
      <div className="absolute inset-x-0 h-0.5 bg-border top-1/2 -translate-y-1/2" />
      
      {/* Events */}
      <div className="relative flex justify-between">
        {events.map((event, i) => (
          <div key={i} className="flex flex-col items-center">
            {/* Dot */}
            <div
              className={cn(
                "w-3 h-3 rounded-full border-2 bg-background transition-all",
                event.isCurrent
                  ? "border-primary bg-primary shadow-lg shadow-primary/50"
                  : "border-muted-foreground/30"
              )}
            />
            
            {/* Date */}
            <span className="mt-2 text-xs text-muted-foreground whitespace-nowrap">
              {formatDate(event.date)}
            </span>
            
            {/* Label */}
            <span
              className={cn(
                "text-xs font-medium whitespace-nowrap",
                event.isCurrent ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {event.label}
            </span>
            
            {/* Relative time */}
            {event.date && (
              <span className="text-xs text-muted-foreground/70 whitespace-nowrap">
                ({formatRelativeTime(event.date)})
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
