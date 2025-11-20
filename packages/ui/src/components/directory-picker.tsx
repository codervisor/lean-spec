'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Folder, ChevronUp, Loader2, ArrowLeft, Home, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface DirectoryPickerProps {
  onSelect: (path: string) => void;
  onCancel: () => void;
  initialPath?: string;
}

export function DirectoryPicker({ onSelect, onCancel, initialPath }: DirectoryPickerProps) {
  const [currentPath, setCurrentPath] = useState(initialPath || '');
  const [items, setItems] = useState<DirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDirectory(currentPath);
  }, [currentPath]);

  // Auto-scroll breadcrumbs to end when path changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [currentPath]);

  const fetchDirectory = async (path: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/local-projects/list-directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });

      if (!response.ok) {
        throw new Error('Failed to list directory');
      }

      const data = await response.json();
      setItems(data.items);
      // Update current path to the resolved path from server
      if (!path) {
        setCurrentPath(data.path);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  const parentItem = items.find(item => item.name === '..');
  const displayItems = items.filter(item => item.name !== '..');

  // Parse path segments for breadcrumbs
  const getPathSegments = (path: string) => {
    if (!path) return [];
    // Handle both Unix and Windows separators
    const separator = path.includes('\\') ? '\\' : '/';
    const parts = path.split(separator).filter(Boolean);
    
    // If path starts with separator (Unix root), add it back
    const isUnixRoot = path.startsWith('/');
    
    return parts.map((part, index) => {
      let segmentPath = parts.slice(0, index + 1).join(separator);
      if (isUnixRoot) segmentPath = '/' + segmentPath;
      // On Windows, the first part (C:) doesn't need a leading separator
      
      return { name: part, path: segmentPath };
    });
  };

  const segments = getPathSegments(currentPath);

  return (
    <div className="flex flex-col h-[400px] gap-4 min-w-0">
      {/* Navigation Bar */}
      <div className="flex items-center border rounded-md p-1 gap-1 bg-muted/30">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 shrink-0"
          disabled={!parentItem || isLoading}
          onClick={() => parentItem && handleNavigate(parentItem.path)}
          title="Go to parent directory"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto whitespace-nowrap flex items-center scrollbar-hide px-1 min-w-0"
        >
          <button 
            onClick={() => handleNavigate('/')}
            className="hover:bg-accent p-1 rounded-sm transition-colors shrink-0"
            title="Go to root"
          >
            <Home className="h-4 w-4 text-muted-foreground" />
          </button>
          
          {segments.map((segment, i) => (
            <div key={segment.path} className="flex items-center shrink-0">
              <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5 shrink-0" />
              <button 
                onClick={() => handleNavigate(segment.path)}
                className={cn(
                  "px-1.5 py-0.5 rounded-sm transition-colors text-sm hover:bg-accent hover:text-accent-foreground",
                  i === segments.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {segment.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 border rounded-md overflow-hidden relative bg-background min-h-0">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        
        {error ? (
          <div className="p-4 text-destructive text-sm text-center">
            {error}
            <Button variant="link" onClick={() => fetchDirectory(currentPath)} className="block mx-auto mt-2">
              Retry
            </Button>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <div className="p-1">
              {displayItems.length === 0 && !isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Empty directory
                </div>
              ) : (
                displayItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground text-left group transition-colors"
                  >
                    <Folder className="h-4 w-4 text-blue-500 fill-blue-500/20 group-hover:fill-blue-500/30 transition-colors shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSelect(currentPath)} disabled={isLoading || !currentPath}>
          Select This Folder
        </Button>
      </div>
    </div>
  );
}
