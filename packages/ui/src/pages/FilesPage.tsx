/**
 * FilesPage - VS Code-like codebase browser
 * Spec 246 - Codebase File Viewing in @leanspec/ui
 */

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/library';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { api } from '../lib/api';
import { FileExplorer } from '../components/files/FileExplorer';
import { CodeViewer } from '../components/files/CodeViewer';
import type { FileContentResponse, FileListResponse } from '../types/api';

export function FilesPage() {
  const { currentProject, loading: projectLoading } = useCurrentProject();
  const { t } = useTranslation('common');

  const [rootListing, setRootListing] = useState<FileListResponse | null>(null);
  const [fetchingRoot, setFetchingRoot] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);

  const loadingRoot = projectLoading || fetchingRoot;

  const [selectedPath, setSelectedPath] = useState<string | undefined>();
  const [fileContent, setFileContent] = useState<FileContentResponse | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Load root directory listing
  useEffect(() => {
    async function loadRoot() {
      if (projectLoading || !currentProject?.id) {
        return;
      }

      setFetchingRoot(true);
      setRootError(null);

      try {
        const listing = await api.getFiles();
        setRootListing(listing);
      } catch (err) {
        setRootError(err instanceof Error ? err.message : t('filesPage.errors.loadFailed'));
      } finally {
        setFetchingRoot(false);
      }
    }

    void loadRoot();
  }, [currentProject?.id, projectLoading, t]);

  // Load file content when selection changes
  const handleFileSelect = (path: string) => {
    setSelectedPath(path);
    setFileError(null);
    setLoadingFile(true);
    setFileContent(null);

    api.getFile(path)
      .then((content) => {
        setFileContent(content);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : t('filesPage.errors.fileFailed');
        // Surface specific messages like "Binary file" or "File too large"
        setFileError(message);
      })
      .finally(() => {
        setLoadingFile(false);
      });
  };

  if (projectLoading || loadingRoot) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">{t('filesPage.loading')}</span>
      </div>
    );
  }

  if (rootError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="flex justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground">{rootError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentProject || !rootListing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t('filesPage.selectFile')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden border-t">
      {/* File explorer panel */}
      <div className="w-64 flex-shrink-0 border-r overflow-hidden flex flex-col bg-background">
        <div className="px-3 py-2 border-b flex-shrink-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {currentProject.displayName ?? currentProject.name ?? t('filesPage.title')}
          </h2>
        </div>
        <FileExplorer
          rootListing={rootListing}
          selectedPath={selectedPath}
          onFileSelect={handleFileSelect}
        />
      </div>

      {/* Code viewer panel */}
      <div className="flex-1 overflow-hidden flex flex-col bg-background">
        {loadingFile ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">{t('filesPage.loadingFile')}</span>
          </div>
        ) : fileError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2 max-w-sm">
              <AlertCircle className="w-8 h-8 mx-auto text-destructive/70" />
              <p className="text-sm text-muted-foreground">{fileError}</p>
            </div>
          </div>
        ) : fileContent ? (
          <CodeViewer file={fileContent} className="h-full" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t('filesPage.selectFile')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
