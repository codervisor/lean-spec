/**
 * FilesPage - VS Code-like codebase browser
 * Spec 246 - Codebase File Viewing in @leanspec/ui
 */

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, FolderOpen, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/library';
import { Card, CardContent } from '@/library';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { api } from '../lib/api';
import { FileExplorer } from '../components/files/FileExplorer';
import { FileIcon } from '../components/files/FileIcon';
import { CodeViewer } from '../components/files/CodeViewer';
import type { FileContentResponse, FileListResponse } from '../types/api';

interface OpenTab {
  path: string;
  fileName: string;
}

interface TabBarProps {
  tabs: OpenTab[];
  activeTab?: string;
  onTabSelect: (path: string) => void;
  onTabClose: (path: string) => void;
}

function TabBar({ tabs, activeTab, onTabSelect, onTabClose }: TabBarProps) {
  const { t } = useTranslation('common');

  if (tabs.length === 0) return null;

  return (
    <div className="flex border-b bg-muted/20 overflow-x-auto flex-shrink-0 scrollbar-none" role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.path === activeTab;
        return (
          <div
            key={tab.path}
            role="tab"
            aria-selected={isActive}
            className={cn(
              'group flex items-center gap-1.5 px-3 py-1.5 border-r border-border/50 cursor-pointer select-none whitespace-nowrap min-w-0 max-w-[200px] transition-colors flex-shrink-0',
              isActive
                ? 'bg-background border-b-2 border-b-primary text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border-b-2 border-b-transparent'
            )}
            title={tab.path}
            onClick={() => onTabSelect(tab.path)}
            onKeyDown={(e) => { if (e.key === 'Enter') onTabSelect(tab.path); }}
            tabIndex={0}
          >
            <FileIcon name={tab.fileName} className="flex-shrink-0" />
            <span className="text-xs truncate">{tab.fileName}</span>
            <button
              className={cn(
                'flex-shrink-0 rounded p-0.5 ml-0.5 transition-colors',
                isActive
                  ? 'opacity-60 hover:opacity-100 hover:bg-muted'
                  : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-muted'
              )}
              onClick={(e) => { e.stopPropagation(); onTabClose(tab.path); }}
              title={t('filesPage.closeTab')}
              aria-label={t('filesPage.closeTab')}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function FilesPage() {
  const { currentProject, loading: projectLoading } = useCurrentProject();
  const { t } = useTranslation('common');

  const [rootListing, setRootListing] = useState<FileListResponse | null>(null);
  const [fetchingRoot, setFetchingRoot] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);

  const loadingRoot = projectLoading || fetchingRoot;

  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | undefined>();
  const [fileContents, setFileContents] = useState<Map<string, FileContentResponse>>(new Map());
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
    const fileName = path.split('/').pop() ?? path;

    // Add tab if not already open
    setTabs((prev) => {
      if (prev.some((t) => t.path === path)) return prev;
      return [...prev, { path, fileName }];
    });
    setActiveTabPath(path);
    setFileError(null);

    // If content already cached, just activate
    if (fileContents.has(path)) return;

    setLoadingFile(true);
    api.getFile(path)
      .then((content) => {
        setFileContents((prev) => new Map(prev).set(path, content));
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : t('filesPage.errors.fileFailed');
        setFileError(message);
      })
      .finally(() => {
        setLoadingFile(false);
      });
  };

  const handleTabClose = (path: string) => {
    setTabs((prev) => {
      const remaining = prev.filter((t) => t.path !== path);
      if (activeTabPath === path) {
        // Activate nearest remaining tab
        const idx = prev.findIndex((t) => t.path === path);
        const next = remaining[idx] ?? remaining[idx - 1];
        setActiveTabPath(next?.path);
      }
      return remaining;
    });
    setFileContents((prev) => {
      const next = new Map(prev);
      next.delete(path);
      return next;
    });
  };

  const activeContent = activeTabPath ? fileContents.get(activeTabPath) : undefined;

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
          selectedPath={activeTabPath}
          onFileSelect={handleFileSelect}
        />
      </div>

      {/* Code viewer panel */}
      <div className="flex-1 overflow-hidden flex flex-col bg-background">
        {/* Tab bar */}
        <TabBar
          tabs={tabs}
          activeTab={activeTabPath}
          onTabSelect={handleFileSelect}
          onTabClose={handleTabClose}
        />

        {/* Content area */}
        {loadingFile && !activeContent ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">{t('filesPage.loadingFile')}</span>
          </div>
        ) : fileError && !activeContent ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2 max-w-sm">
              <AlertCircle className="w-8 h-8 mx-auto text-destructive/70" />
              <p className="text-sm text-muted-foreground">{fileError}</p>
            </div>
          </div>
        ) : activeContent ? (
          <CodeViewer file={activeContent} className="h-full" />
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
