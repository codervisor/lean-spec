import type { ReactNode } from 'react';
import { cn } from '@leanspec/ui-components';
import { useLayoutStore } from '../../stores/layout';

type PageContainerPadding = 'default' | 'compact' | 'none';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  padding?: PageContainerPadding;
}

const paddingClasses: Record<PageContainerPadding, string> = {
  default: 'px-4 sm:px-6 lg:px-8 py-6',
  compact: 'px-4 sm:px-6 py-4',
  none: '',
};

export function PageContainer({
  children,
  className,
  contentClassName,
  padding = 'default',
}: PageContainerProps) {
  const { isWideMode } = useLayoutStore();

  return (
    <div className={cn('w-full', paddingClasses[padding], className)}>
      <div
        className={cn(
          'mx-auto w-full lg:min-w-4xl',
          isWideMode ? 'max-w-full' : 'max-w-7xl',
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
