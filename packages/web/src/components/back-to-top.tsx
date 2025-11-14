'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';

export function BackToTop() {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled down 300px
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-40 hover:scale-110 transition-transform"
      aria-label="Back to top"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
}
