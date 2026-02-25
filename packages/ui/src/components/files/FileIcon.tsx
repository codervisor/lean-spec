/**
 * FileIcon - file type icons for the file explorer using @exuanbo/file-icons-js
 */

import { useState, useEffect } from 'react';
import { File, Folder } from 'lucide-react';
import icons from '@exuanbo/file-icons-js';
import '@exuanbo/file-icons-js/dist/css/file-icons.min.css';
import { cn } from '@/library';

export interface FileIconProps {
  name: string;
  isDirectory?: boolean;
  isOpen?: boolean;
  className?: string;
}

export function FileIcon({ name, isDirectory = false, isOpen = false, className }: FileIconProps) {
  const [iconClass, setIconClass] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const lookupName = isDirectory ? `${name}/` : name;
    icons.getClass(lookupName).then((cls) => {
      if (!cancelled) {
        setIconClass(typeof cls === 'string' ? cls : null);
      }
    });
    return () => { cancelled = true; };
  }, [name, isDirectory]);

  if (isDirectory) {
    const FolderIcon = Folder;
    return (
      <span className={cn('relative w-4 h-4 flex-shrink-0 inline-flex', className)}>
        <FolderIcon
          className="w-4 h-4 text-muted-foreground"
          {...(!isOpen && { fill: 'currentColor' })}
        />
        {iconClass && iconClass !== 'icon default-icon' && (
          <i
            className={cn(
              'not-italic inline-flex w-2 h-2 absolute bottom-0 right-0 before:!-top-1 before:!w-2 before:!h-2 before:!text-[10px]',
              iconClass,
            )}
          />
        )}
      </span>
    );
  }
  if (iconClass && iconClass !== 'icon default-icon') {
    return (
      <i
        className={cn('not-italic w-4 h-4 flex-shrink-0 before:!top-0', iconClass, className)}
      />
    );
  }
  return <File className={cn('w-4 h-4 flex-shrink-0 text-muted-foreground', className)} />;
}
