import { type ReactNode } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@leanspec/ui-components';
import { EmptyState } from './empty-state';
import i18n from '../../lib/i18n';

interface Props {
  children: ReactNode;
  title?: string;
  message?: string;
  onReset?: () => void;
  /**
   * When this value changes, the boundary resets its error state.
   * This lets us recover on navigation without remounting the whole subtree.
   */
  resetKey?: unknown;
}

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  title?: string;
  message?: string;
}

/**
 * ErrorBoundary wrapper using react-error-boundary library.
 * Provides a hook-friendly API while using a class component internally.
 */
function ErrorFallback({ error, resetErrorBoundary, title, message }: FallbackProps) {
  // Use i18n.t directly with fallbacks to avoid hook issues
  const fallbackTitle = i18n.t?.('pageError.title', { ns: 'errors', defaultValue: 'Something went wrong' }) || 'Something went wrong';
  const fallbackMessage = i18n.t?.('pageError.description', { ns: 'errors', defaultValue: 'An unexpected error occurred. Please try again.' }) || 'An unexpected error occurred. Please try again.';
  const retryLabel = i18n.t?.('actions.retry', { ns: 'common', defaultValue: 'Try again' }) || 'Try again';
  const reloadLabel = i18n.t?.('actions.refresh', { ns: 'common', defaultValue: 'Reload' }) || 'Reload';

  return (
    <EmptyState
      icon={AlertTriangle}
      title={title || fallbackTitle}
      description={message || error?.message || fallbackMessage}
      tone="error"
      actions={(
        <>
          <Button size="sm" onClick={resetErrorBoundary}>
            {retryLabel}
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            {reloadLabel}
          </Button>
        </>
      )}
    />
  );
}

export function ErrorBoundary({ children, title, message, onReset, resetKey }: Props) {
  const handleReset = () => {
    onReset?.();
  };

  const handleError = (error: Error, errorInfo: { componentStack?: string | null }) => {
    console.error('UI error captured', error, errorInfo);
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={(props) => (
        <ErrorFallback {...props} title={title} message={message} />
      )}
      onReset={handleReset}
      onError={handleError}
      resetKeys={[resetKey]}
    >
      {children}
    </ReactErrorBoundary>
  );
}
