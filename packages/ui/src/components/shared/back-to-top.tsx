import { BackToTop as UIBackToTop } from '@/library';

interface BackToTopProps {
  targetId?: string;
}

export function BackToTop({ targetId }: BackToTopProps) {
  return (
    <UIBackToTop
      threshold={300}
      bottom={24}
      right={24}
      targetId={targetId}
      className="shadow-lg"
    />
  );
}
