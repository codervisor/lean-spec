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
  /** Optional target scroll container element id. Falls back to window. */
  targetId?: string;
}

export function BackToTop({
  threshold = 300,
  className,
  bottom = 24,
  right = 24,
  targetId,
}: BackToTopProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const targetElement = targetId ? document.getElementById(targetId) : null;
    const getScrollTop = () => targetElement ? targetElement.scrollTop : window.scrollY;

    const toggleVisibility = () => {
      if (getScrollTop() > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    const scrollTarget: HTMLElement | Window = targetElement ?? window;

    scrollTarget.addEventListener('scroll', toggleVisibility);
    toggleVisibility();

    return () => scrollTarget.removeEventListener('scroll', toggleVisibility);
  }, [threshold, targetId]);

  const scrollToTop = () => {
    const targetElement = targetId ? document.getElementById(targetId) : null;
    if (targetElement) {
      targetElement.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
      return;
    }

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
