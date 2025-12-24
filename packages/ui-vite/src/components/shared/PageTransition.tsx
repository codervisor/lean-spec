import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const id = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, [location.pathname]);

  return (
    <div
      key={location.pathname}
      className={cn(
        'transition-all duration-200 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      {children}
    </div>
  );
}
