import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@leanspec/ui-components';
import { EmptyState } from './EmptyState';

interface Props {
  children: ReactNode;
  title?: string;
  message?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('UI error captured', error, errorInfo);
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
          title={this.props.title || 'Something went wrong'}
          description={this.props.message || this.state.error?.message || 'The page failed to render.'}
          tone="error"
          actions={(
            <>
              <Button size="sm" onClick={this.resetBoundary}>
                Retry
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                Reload page
              </Button>
            </>
          )}
        />
      );
    }

    return this.props.children;
  }
}
