/**
 * BackToTop component
 * Floating button that scrolls to the top of the page
 */

import * as React from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

export interface BackToTopProps {
  /** Scroll threshold before showing button (in pixels) */
  threshold?: number;
  /** Additional CSS classes */
  className?: string;
  /** Position from bottom (in pixels or CSS value) */
  bottom?: string | number;
  /** Position from right (in pixels or CSS value) */
  right?: string | number;
}

export function BackToTop({
  threshold = 300,
  className,
  bottom = 24,
  right = 24,
}: BackToTopProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  const bottomValue = typeof bottom === 'number' ? `${bottom}px` : bottom;
  const rightValue = typeof right === 'number' ? `${right}px` : right;

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={cn(
        'fixed h-12 w-12 rounded-full shadow-lg z-40 hover:scale-110 transition-transform',
        className
      )}
      style={{ bottom: bottomValue, right: rightValue }}
      aria-label="Back to top"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
}
