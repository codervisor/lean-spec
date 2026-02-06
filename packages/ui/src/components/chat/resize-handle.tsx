import { useEffect, useState } from 'react';
import { cn } from '@/library';

interface ResizeHandleProps {
  onResize: (width: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  minWidth?: number;
  maxWidth?: number;
}

export function ResizeHandle({
  onResize,
  onResizeStart,
  onResizeEnd,
  minWidth = 300,
  maxWidth = Infinity
}: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate new width relative to window width (since sidebar is on right)
      // width = windowWidth - mouseX
      const newWidth = window.innerWidth - e.clientX;
      const safeMaxWidth = Math.min(maxWidth, window.innerWidth);
      const constrainedWidth = Math.min(Math.max(newWidth, minWidth), safeMaxWidth);
      onResize(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onResizeEnd?.();
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, minWidth, maxWidth, onResize, onResizeEnd]);

  return (
    <div
      className={cn(
        "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-50",
        isDragging && "bg-primary/50 w-1.5"
      )}
      onMouseDown={() => {
        setIsDragging(true);
        onResizeStart?.();
      }}
    />
  );
}
