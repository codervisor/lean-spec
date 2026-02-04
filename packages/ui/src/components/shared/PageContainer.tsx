import type { ReactNode } from 'react';
import { cn } from '@leanspec/ui-components';
import { useDisplayStore } from '../../stores/display';

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
  const { displayMode } = useDisplayStore();

  return (
    <div className={cn('w-full', paddingClasses[padding], className)}>
      <div
        className={cn(
          'mx-auto w-full transition-[max-width] duration-300',
          // Normal: 4xl (max-w-4xl), Wide: 7xl (max-w-7xl)
          displayMode === 'wide' ? 'max-w-7xl' : 'max-w-4xl',
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
