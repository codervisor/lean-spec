/**
 * Timeline component to visualize spec evolution (vertical layout)
 */

import { Clock, PlayCircle, CheckCircle2, Archive, Circle } from 'lucide-react';
import { formatRelativeTime, formatDuration } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  label: string;
  date: Date | string | number | null | undefined;
  isActive?: boolean;
  isFuture?: boolean;
  icon?: typeof Clock | typeof PlayCircle | typeof CheckCircle2 | typeof Archive | typeof Circle;
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
      isActive: true,
      isFuture: false,
      icon: Clock,
      color: 'text-blue-600',
    });
  }

  // Add in-progress
  if (status === 'in-progress' || status === 'complete' || status === 'archived') {
    events.push({
      label: 'In Progress',
      date: updatedAt || createdAt,
      isActive: true,
      isFuture: false,
      icon: PlayCircle,
      color: 'text-orange-600',
    });
  } else {
    events.push({
      label: 'In Progress',
      date: null,
      isActive: false,
      isFuture: true,
      icon: Circle,
      color: 'text-muted-foreground',
    });
  }

  // Add completed
  if (status === 'complete' || status === 'archived') {
    events.push({
      label: 'Complete',
      date: completedAt || updatedAt,
      isActive: true,
      isFuture: false,
      icon: CheckCircle2,
      color: 'text-green-600',
    });
  } else {
    events.push({
      label: 'Complete',
      date: null,
      isActive: false,
      isFuture: true,
      icon: Circle,
      color: 'text-muted-foreground',
    });
  }

  // Add archived if status is archived
  if (status === 'archived') {
    events.push({
      label: 'Archived',
      date: updatedAt,
      isActive: true,
      isFuture: false,
      icon: Archive,
      color: 'text-gray-600',
    });
  }

  if (events.length === 0) return null;

  return (
    <div className={cn('flex items-start gap-2', className)}>
      {events.map((event, i) => {
        const Icon = event.icon;
        const isLast = i === events.length - 1;
        const nextEvent = !isLast ? events[i + 1] : null;
        const duration = event.date && nextEvent?.date && !nextEvent.isFuture
          ? formatDuration(event.date, nextEvent.date)
          : '';
        
        return (
          <div key={i} className="flex items-center gap-2 flex-1">
            {/* Event content */}
            <div className="flex flex-col items-center gap-1 min-w-0">
              {/* Icon */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full border-2 bg-background flex items-center justify-center shrink-0",
                  event.isActive && !event.isFuture
                    ? "border-primary"
                    : "border-muted-foreground/40"
                )}
              >
                {Icon && (
                  <Icon 
                    className={cn(
                      "h-4 w-4",
                      event.isActive && !event.isFuture ? "text-primary" : "text-muted-foreground/60"
                    )} 
                  />
                )}
              </div>
              
              {/* Label */}
              <div
                className={cn(
                  "text-xs font-medium text-center whitespace-nowrap",
                  event.isActive && !event.isFuture ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {event.label}
              </div>
              
              {/* Date */}
              {event.date && !event.isFuture && (
                <div className="text-[10px] text-muted-foreground text-center">
                  {formatRelativeTime(event.date)}
                </div>
              )}
            </div>
            
            {/* Connecting line with duration */}
            {!isLast && (
              <div className="flex flex-col items-center flex-1 min-w-4 gap-0.5">
                <div 
                  className={cn(
                    "h-0.5 w-full",
                    event.isActive && !event.isFuture 
                      ? "bg-primary" 
                      : "bg-muted-foreground/40"
                  )}
                />
                {duration && (
                  <div className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                    {duration}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
