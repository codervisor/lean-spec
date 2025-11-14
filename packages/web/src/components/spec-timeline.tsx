/**
 * Timeline component to visualize spec evolution (vertical layout)
 */

import { Clock, PlayCircle, CheckCircle2, Archive, Circle } from 'lucide-react';
import { formatDate, formatRelativeTime } from '@/lib/date-utils';
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
    <div className={cn('space-y-4 border-l-2 border-muted pl-6 py-2', className)}>
      {events.map((event, i) => {
        const Icon = event.icon;
        return (
          <div key={i} className="relative">
            {/* Icon dot */}
            <div className="absolute -left-[29px] top-0">
              <div
                className={cn(
                  "w-4 h-4 rounded-full border-2 bg-background flex items-center justify-center",
                  event.isActive && !event.isFuture
                    ? "border-primary"
                    : "border-muted-foreground/40"
                )}
              >
                {Icon && (
                  <Icon 
                    className={cn(
                      "h-2.5 w-2.5",
                      event.isActive && !event.isFuture ? "text-primary" : "text-muted-foreground/60"
                    )} 
                  />
                )}
              </div>
            </div>
            
            {/* Content */}
            <div>
              <div
                className={cn(
                  "text-sm font-medium",
                  event.isActive && !event.isFuture ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {event.label}
              </div>
              
              {event.date && !event.isFuture && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(event.date)}
                  {' · '}
                  {formatRelativeTime(event.date)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
