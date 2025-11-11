'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-destructive">500</h1>
          <h2 className="text-2xl font-semibold">Something went wrong!</h2>
          <p className="text-muted-foreground">
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-2 rounded">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        
        <div className="flex gap-4 justify-center">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
