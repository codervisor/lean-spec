import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, Folder, Home, Loader2 } from 'lucide-react';
import { Button } from '@leanspec/ui-components';
import { cn } from '@leanspec/ui-components';
import { api } from '../../lib/api';
import type { DirectoryListResponse } from '../../types/api';
import { useTranslation } from 'react-i18next';

interface DirectoryPickerProps {
  onSelect: (path: string) => void;
  onCancel: () => void;
  initialPath?: string;
  actionLabel?: string;
  isLoading?: boolean;
}

export function DirectoryPicker({
  onSelect,
  onCancel,
  initialPath,
  actionLabel,
  isLoading: externalLoading,
}: DirectoryPickerProps) {
  const [currentPath, setCurrentPath] = useState(initialPath || '');
  const [items, setItems] = useState<DirectoryListResponse['items']>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation('common');

  const isLoading = externalLoading || internalLoading;

  useEffect(() => {
    void fetchDirectory(currentPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [currentPath]);

  const fetchDirectory = async (path: string) => {
    try {
      setInternalLoading(true);
      setError(null);
      const data = await api.listDirectory(path);
      setItems(data.items || []);
      if (!path && data.path) {
        setCurrentPath(data.path);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('directoryPicker.error');
      setError(message);
    } finally {
      setInternalLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  const parentItem = items.find((item: DirectoryListResponse['items'][number]) => item.name === '..');
  const displayItems = items.filter((item: DirectoryListResponse['items'][number]) => item.name !== '..');

  const getPathSegments = (path: string) => {
    if (!path) return [];
    const separator = path.includes('\\') ? '\\' : '/';
    const parts = path.split(separator).filter(Boolean);
    const isUnixRoot = path.startsWith('/');

    return parts.map((part, index) => {
      let segmentPath = parts.slice(0, index + 1).join(separator);
      if (isUnixRoot) segmentPath = '/' + segmentPath;
      return { name: part, path: segmentPath };
    });
  };

  const segments = getPathSegments(currentPath);
  const resolvedActionLabel = actionLabel ?? t('directoryPicker.action');

  return (
    <div className="flex flex-col h-[400px] gap-4 min-w-0 overflow-hidden">
      <div className="flex items-center border rounded-md p-1 gap-1 bg-muted/30 min-w-0 overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={!parentItem || isLoading}
          onClick={() => parentItem && handleNavigate(parentItem.path)}
          title={t('directoryPicker.parent')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-1 shrink-0" />

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto whitespace-nowrap flex items-center scrollbar-hide px-1 min-w-0"
          title={currentPath}
        >
          <Button
            onClick={() => handleNavigate('/')}
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            title={t('directoryPicker.rootAction')}
          >
            <Home className="h-4 w-4 text-muted-foreground" />
          </Button>

          {segments.map((segment, index) => (
            <div key={segment.path} className="flex items-center shrink-0">
              <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5 shrink-0" />
              <Button
                onClick={() => handleNavigate(segment.path)}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 text-sm',
                  index === segments.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground'
                )}
              >
                {segment.name}
              </Button>
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
              {t('actions.retry')}
            </Button>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <div className="p-1">
              {displayItems.length === 0 && !isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">{t('directoryPicker.empty')}</div>
              ) : (
                displayItems.map((item: DirectoryListResponse['items'][number]) => (
                  <Button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-3 h-9 group"
                  >
                    <Folder className="h-4 w-4 text-blue-500 fill-blue-500/20 group-hover:fill-blue-500/30 transition-colors shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          {t('actions.cancel')}
        </Button>
        <Button onClick={() => onSelect(currentPath)} disabled={isLoading || !currentPath}>
          {resolvedActionLabel}
        </Button>
      </div>
    </div>
  );
}
