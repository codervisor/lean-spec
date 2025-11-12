'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, PlayCircle, CheckCircle2, Archive } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { PriorityBadge } from '@/components/priority-badge';
import { cn } from '@/lib/utils';

interface Spec {
  id: string;
  specNumber: number | null;
  specName: string;
  title: string | null;
  status: string | null;
  priority: string | null;
  tags: string[] | null;
}

interface BoardClientProps {
  initialSpecs: Spec[];
}

export function BoardClient({ initialSpecs }: BoardClientProps) {
  const statusConfig = {
    'planned': {
      icon: Clock,
      title: 'Planned',
      colorClass: 'text-orange-600 dark:text-orange-400',
      bgClass: 'bg-orange-50 dark:bg-orange-900/20',
      borderClass: 'border-orange-200 dark:border-orange-800'
    },
    'in-progress': {
      icon: PlayCircle,
      title: 'In Progress',
      colorClass: 'text-blue-600 dark:text-blue-400',
      bgClass: 'bg-blue-50 dark:bg-blue-900/20',
      borderClass: 'border-blue-200 dark:border-blue-800'
    },
    'complete': {
      icon: CheckCircle2,
      title: 'Complete',
      colorClass: 'text-green-600 dark:text-green-400',
      bgClass: 'bg-green-50 dark:bg-green-900/20',
      borderClass: 'border-green-200 dark:border-green-800'
    },
    'archived': {
      icon: Archive,
      title: 'Archived',
      colorClass: 'text-gray-600 dark:text-gray-400',
      bgClass: 'bg-gray-50 dark:bg-gray-900/20',
      borderClass: 'border-gray-200 dark:border-gray-800'
    }
  };

  const columns = useMemo(() => {
    const statuses = ['planned', 'in-progress', 'complete', 'archived'] as const;
    
    return statuses.map(status => ({
      status,
      config: statusConfig[status],
      specs: initialSpecs.filter(spec => spec.status === status),
    }));
  }, [initialSpecs]);

  return (
    <div className="min-h-screen bg-background">
      <section className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Kanban Board</h1>
          <p className="text-muted-foreground mt-2">Track spec progress across all statuses</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {columns.map(column => {
            const Icon = column.config.icon;
            return (
              <div key={column.status} className="flex flex-col">
                <div className={cn(
                  "mb-4 p-3 rounded-lg border-2",
                  column.config.bgClass,
                  column.config.borderClass
                )}>
                  <h2 className={cn(
                    "text-lg font-semibold flex items-center gap-2",
                    column.config.colorClass
                  )}>
                    <Icon className="h-5 w-5" />
                    {column.config.title}
                    <Badge variant="outline" className="ml-auto">{column.specs.length}</Badge>
                  </h2>
                </div>

                <div className="space-y-3 flex-1">
                  {column.specs.map(spec => {
                    // Get priority color for left border
                    const priorityColors = {
                      'critical': 'border-l-red-500',
                      'high': 'border-l-orange-500',
                      'medium': 'border-l-blue-500',
                      'low': 'border-l-gray-400'
                    };
                    const borderColor = priorityColors[spec.priority as keyof typeof priorityColors] || priorityColors.medium;

                    return (
                      <Card 
                        key={spec.id} 
                        className={cn(
                          "hover:shadow-lg transition-all duration-150 hover:scale-[1.02] border-l-4",
                          borderColor
                        )}
                      >
                        <CardHeader className="pb-3">
                          <Link href={`/specs/${spec.id}`}>
                            <CardTitle className="text-sm font-medium hover:text-primary transition-colors">
                              {spec.specNumber ? `#${spec.specNumber}` : spec.specName}
                            </CardTitle>
                          </Link>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {spec.title || spec.specName}
                          </p>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            {spec.priority && <PriorityBadge priority={spec.priority} />}
                            
                            {spec.tags && spec.tags.length > 0 && (
                              <>
                                {spec.tags.slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {spec.tags.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{spec.tags.length - 2}
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {column.specs.length === 0 && (
                    <Card className="border-dashed">
                      <CardContent className="py-8 text-center">
                        <Icon className={cn("mx-auto h-8 w-8 mb-2", column.config.colorClass, "opacity-50")} />
                        <p className="text-sm text-muted-foreground">No {column.config.title.toLowerCase()} specs</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
