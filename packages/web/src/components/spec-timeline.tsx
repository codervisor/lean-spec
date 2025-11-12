/**
 * Timeline component to visualize spec evolution
 */

import { Clock, PlayCircle, CheckCircle2, Archive } from 'lucide-react';
import { formatDate, formatRelativeTime } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  label: string;
  date: Date | string | number | null | undefined;
  isCurrent?: boolean;
  icon?: typeof Clock | typeof PlayCircle | typeof CheckCircle2 | typeof Archive;
  color?: string;
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
      icon: Clock,
      color: 'text-orange-600',
    });
  }

  // Add in-progress if status is in-progress or later
  if (status === 'in-progress' || status === 'complete' || status === 'archived') {
    events.push({
      label: 'Started',
      date: updatedAt || createdAt,
      isCurrent: status === 'in-progress',
      icon: PlayCircle,
      color: 'text-blue-600',
    });
  }

  // Add completed if status is complete
  if (completedAt || status === 'complete') {
    events.push({
      label: 'Completed',
      date: completedAt || updatedAt,
      isCurrent: status === 'complete',
      icon: CheckCircle2,
      color: 'text-green-600',
    });
  }

  // Add archived if status is archived
  if (status === 'archived') {
    events.push({
      label: 'Archived',
      date: updatedAt,
      isCurrent: true,
      icon: Archive,
      color: 'text-gray-600',
    });
  }

  if (events.length === 0) return null;

  return (
    <div className={cn('relative py-8', className)}>
      {/* Connection line */}
      <div className="absolute inset-x-0 h-0.5 bg-border top-1/2 -translate-y-1/2" />
      
      {/* Events */}
      <div className="relative flex justify-between">
        {events.map((event, i) => {
          const Icon = event.icon;
          return (
            <div key={i} className="flex flex-col items-center">
              {/* Icon with dot */}
              <div className="relative">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full border-2 bg-background flex items-center justify-center transition-all",
                    event.isCurrent
                      ? "border-primary shadow-lg shadow-primary/20"
                      : "border-muted-foreground/20"
                  )}
                >
                  {Icon && (
                    <Icon 
                      className={cn(
                        "h-5 w-5",
                        event.isCurrent ? "text-primary" : event.color || "text-muted-foreground"
                      )} 
                    />
                  )}
                </div>
              </div>
              
              {/* Label */}
              <span
                className={cn(
                  "mt-2 text-xs font-medium whitespace-nowrap",
                  event.isCurrent ? "text-foreground font-semibold" : "text-muted-foreground"
                )}
              >
                {event.label}
              </span>
              
              {/* Date */}
              <span className="mt-1 text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(event.date)}
              </span>
              
              {/* Relative time */}
              {event.date && (
                <span className="text-xs text-muted-foreground/70 whitespace-nowrap">
                  {formatRelativeTime(event.date)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
