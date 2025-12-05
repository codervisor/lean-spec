/**
 * Client-only wrapper component
 * Prevents hydration mismatch for components that generate dynamic IDs (like Radix UI)
 * 
 * Use this for:
 * - Radix UI components (Select, Popover, Dialog, etc.) that have aria-controls with dynamic IDs
 * - Components that use useId() internally
 * - Components that depend on client-only state (localStorage, window, etc.)
 */

'use client';

import * as React from 'react';

interface ClientOnlyProps {
  children: React.ReactNode;
  /** Optional fallback to show during SSR/hydration */
  fallback?: React.ReactNode;
}

/**
 * Renders children only on the client after hydration is complete.
 * This prevents hydration mismatches caused by Radix UI's dynamic ID generation.
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
