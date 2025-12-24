import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@leanspec/ui-components';
import { ContextClient } from '../components/context/ContextClient';
import { ContextPageSkeleton } from '../components/shared/Skeletons';
import { useProject } from '../contexts';

export function ContextPage() {
  const { currentProject, loading, error } = useProject();

  if (loading) {
    return <ContextPageSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <div className="flex justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="text-lg font-semibold">Project unavailable</div>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Project Context</h1>
        <p className="text-muted-foreground text-sm">
          Browse contextual files from .lean-spec/context with search, preview, and markdown rendering.
        </p>
      </div>

      <ContextClient projectRoot={currentProject?.path || currentProject?.specsDir || undefined} />
    </div>
  );
}
