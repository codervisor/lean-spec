import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, FileText, Folder, RefreshCcw, Search } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Skeleton } from '@leanspec/ui-components';
import type { ContextFileContent, ContextFileListItem } from '../../lib/api';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { ContextFileDetail } from './ContextFileDetail';
import { ContextPageSkeleton } from '../shared/Skeletons';
import { useProject } from '../../contexts';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../lib/date-utils';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatModified(modified?: string | null, modifiedAt?: Date | null): string {
  const date = modifiedAt ?? (modified ? new Date(modified) : null);
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface ContextClientProps {
  projectRoot?: string;
}

export function ContextClient({ projectRoot }: ContextClientProps) {
  const { currentProject } = useProject();
  const [files, setFiles] = useState<ContextFileListItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileCache, setFileCache] = useState<Record<string, ContextFileContent>>({});
  const [loadingList, setLoadingList] = useState(true);
  const [loadingFile, setLoadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { t, i18n } = useTranslation('common');

  const loadList = async () => {
    setLoadingList(true);
    setError(null);
    try {
      const list = await api.getContextFiles();
      setFiles(list);
      if (list.length > 0) {
        setSelectedPath(list[0].path);
        void loadFile(list[0].path, true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('contextPage.errors.list');
      setError(message);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    void loadList();
  }, [currentProject?.id]);

  const loadFile = async (path: string, silent = false) => {
    if (fileCache[path]) return;
    if (!silent) setLoadingFile(true);
    setFileError(null);
    try {
      const detail = await api.getContextFile(path);
      setFileCache((prev) => ({ ...prev, [path]: detail }));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('contextPage.errors.file');
      setFileError(message);
    } finally {
      setLoadingFile(false);
    }
  };

  const groupedFiles = useMemo(() => {
    const groups = new Map<string, ContextFileListItem[]>();
    const filtered = files.filter((file) => {
      if (!search) return true;
      const query = search.toLowerCase();
      return file.name.toLowerCase().includes(query) || file.path.toLowerCase().includes(query);
    });

    filtered.forEach((file) => {
      const folder = file.path.includes('/') ? file.path.split('/').slice(0, -1).join('/') : 'root';
      const list = groups.get(folder) || [];
      list.push(file);
      groups.set(folder, list);
    });

    return Array.from(groups.entries()).map(([folder, entries]) => ({ folder, entries }));
  }, [files, search]);

  const activeFile = selectedPath ? fileCache[selectedPath] : null;

  if (loadingList) {
    return <ContextPageSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <div className="flex justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="text-lg font-semibold">{t('errors.loadingError')}</div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={loadList} variant="secondary" size="sm" className="mt-2">
            {t('actions.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="h-full">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('contextPage.title')}</CardTitle>
            <Button variant="ghost" size="icon" onClick={loadList} aria-label={t('actions.refresh')}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('contextPage.searchPlaceholder')}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm space-y-3">
              <div className="font-medium text-foreground">{t('contextPage.emptyState.title')}</div>
              <div>{t('contextPage.emptyState.description')}</div>
              <Button size="sm" variant="secondary" onClick={loadList}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                {t('actions.refresh')}
              </Button>
            </div>
          ) : groupedFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm space-y-3">
              <div className="font-medium text-foreground">{t('contextPage.search.noMatchesTitle')}</div>
              <div>{t('contextPage.search.noMatchesDescription')}</div>
              <Button size="sm" variant="outline" onClick={() => setSearch('')}>
                {t('actions.clear')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {groupedFiles.map(({ folder, entries }) => (
                <div key={folder} className="space-y-2">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <Folder className="h-3.5 w-3.5" />
                    {folder === 'root' ? t('directoryPicker.root') : folder}
                    <Badge variant="secondary" className="text-[11px]">{entries.length}</Badge>
                  </div>
                  <div className="space-y-1">
                    {entries.map((file) => (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => {
                          setSelectedPath(file.path);
                          void loadFile(file.path);
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-md border bg-card hover:bg-accent transition-colors',
                          selectedPath === file.path && 'border-primary bg-accent'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-primary" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{file.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{file.path}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                            <span>{formatSize(file.size)}</span>
                            <span>
                              {t('contextPage.detail.modified', {
                                date:
                                  formatModified(file.modified, file.modifiedAt) ||
                                  formatDate(file.modified ?? file.modifiedAt ?? undefined, i18n.language),
                              })}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {selectedPath && loadingFile && !activeFile && (
          <Card>
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        )}

        {fileError && (
          <Card>
            <CardContent className="py-8 text-center space-y-3">
              <div className="flex justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="text-lg font-semibold">{t('errors.operationFailed')}</div>
              <p className="text-sm text-muted-foreground">{fileError}</p>
              <Button variant="secondary" size="sm" onClick={() => selectedPath && loadFile(selectedPath)}>
                {t('actions.retry')}
              </Button>
            </CardContent>
          </Card>
        )}

        {activeFile && !fileError && (
          <ContextFileDetail file={activeFile} projectRoot={projectRoot} />
        )}

        {!activeFile && !loadingFile && !fileError && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t('contextPage.detail.selectFile')}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
