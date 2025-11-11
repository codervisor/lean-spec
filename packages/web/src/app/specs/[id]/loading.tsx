import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function SpecLoading() {
  return (
    <div className="min-h-screen bg-background">
      <section className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-96 mb-4" />
          <div className="flex gap-4 mb-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-5 w-full max-w-2xl" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-4" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
