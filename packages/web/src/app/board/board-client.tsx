'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  const columns = useMemo(() => {
    const statuses = ['planned', 'in-progress', 'complete', 'archived'];
    
    return statuses.map(status => ({
      status,
      title: status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
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
          {columns.map(column => (
            <div key={column.status} className="flex flex-col">
              <div className="mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {column.title}
                  <Badge variant="outline">{column.specs.length}</Badge>
                </h2>
              </div>

              <div className="space-y-3 flex-1">
                {column.specs.map(spec => (
                  <Card key={spec.id} className="hover:shadow-md transition-shadow">
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
                        {spec.priority && (
                          <Badge 
                            variant={
                              spec.priority === 'critical' ? 'destructive' :
                              spec.priority === 'high' ? 'secondary' :
                              'outline'
                            }
                            className="text-xs"
                          >
                            {spec.priority}
                          </Badge>
                        )}
                        
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
                ))}

                {column.specs.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">No specs</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
