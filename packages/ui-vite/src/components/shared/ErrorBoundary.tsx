import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@leanspec/ui-components';
import { EmptyState } from './EmptyState';
import { useTranslation } from 'react-i18next';

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

interface State {
  hasError: boolean;
  error?: Error;
}

interface TranslatedProps extends Props {
  fallbackTitle: string;
  fallbackMessage: string;
  retryLabel: string;
  reloadLabel: string;
}

class ErrorBoundaryInner extends Component<TranslatedProps, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('UI error captured', error, errorInfo);
  }

  componentDidUpdate(prevProps: TranslatedProps) {
    // Reset boundary state when navigating (or other resetKey changes)
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  resetBoundary = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <EmptyState
          icon={AlertTriangle}
          title={this.props.title || this.props.fallbackTitle}
          description={
            this.props.message || this.state.error?.message || this.props.fallbackMessage
          }
          tone="error"
          actions={(
            <>
              <Button size="sm" onClick={this.resetBoundary}>
                {this.props.retryLabel}
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                {this.props.reloadLabel}
              </Button>
            </>
          )}
        />
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary(props: Props) {
  const { t } = useTranslation(['common', 'errors']);

  return (
    <ErrorBoundaryInner
      fallbackTitle={t('pageError.title', { ns: 'errors' })}
      fallbackMessage={t('pageError.description', { ns: 'errors' })}
      retryLabel={t('actions.retry', { ns: 'common' })}
      reloadLabel={t('actions.refresh', { ns: 'common' })}
      {...props}
    />
  );
}
