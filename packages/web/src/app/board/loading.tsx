import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function BoardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <section className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, colIdx) => (
            <div key={colIdx} className="flex flex-col">
              <div className="mb-4">
                <Skeleton className="h-7 w-32" />
              </div>

              <div className="space-y-3 flex-1">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <Skeleton className="h-5 w-24" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex gap-2 pt-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
