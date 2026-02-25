/**
 * FileExplorer - collapsible directory tree for codebase browsing
 * Spec 246 - Codebase File Viewing in @leanspec/ui
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronRight, ChevronDown, Loader2,
  Search, X,
} from 'lucide-react';
import { cn } from '@/library';
import { useTranslation } from 'react-i18next';
import type { FileListResponse, FileSearchEntry } from '../../types/api';
import { api } from '../../lib/api';
import { FileIcon } from './FileIcon';

interface FileExplorerProps {
  /** Initial root listing */
  rootListing: FileListResponse;
  /** Currently selected file path */
  selectedPath?: string;
  /** Called when user clicks a file */
  onFileSelect: (path: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  ignored?: boolean;
  children?: TreeNode[];
  loaded?: boolean;
  loading?: boolean;
  expanded?: boolean;
}

function buildTree(listing: FileListResponse): TreeNode[] {
  const prefix = listing.path === '.' ? '' : listing.path + '/';
  return listing.entries.map((entry) => ({
    name: entry.name,
    path: prefix + entry.name,
    type: entry.type,
    size: entry.size,
    ignored: entry.ignored,
    children: entry.type === 'directory' ? [] : undefined,
    loaded: false,
    loading: false,
    expanded: false,
  }));
}

function updateNodeInTree(
  nodes: TreeNode[],
  path: string,
  updater: (node: TreeNode) => TreeNode
): TreeNode[] {
  return nodes.map((n) => {
    if (n.path === path) {
      return updater(n);
    }
    if (n.children) {
      return { ...n, children: updateNodeInTree(n.children, path, updater) };
    }
    return n;
  });
}

interface FileTreeProps {
  rootListing: FileListResponse;
  selectedPath?: string;
  onFileSelect: (path: string) => void;
  onNodesChange?: (nodes: TreeNode[]) => void;
}

export function FileTree({ rootListing, selectedPath, onFileSelect, onNodesChange }: FileTreeProps) {
  const [nodes, setNodes] = useState<TreeNode[]>(() => buildTree(rootListing));
  const { t } = useTranslation('common');

  const updateNodes = (updater: (prev: TreeNode[]) => TreeNode[]) => {
    setNodes((prev) => {
      const next = updater(prev);
      onNodesChange?.(next);
      return next;
    });
  };

  const handleLoadChildren = async (path: string) => {
    // Mark loading
    updateNodes((prev) =>
      updateNodeInTree(prev, path, (n) => ({ ...n, loading: true }))
    );

    try {
      const listing = await api.getFiles(path);
      const children = listing.entries.map<TreeNode>((entry) => ({
        name: entry.name,
        path: path + '/' + entry.name,
        type: entry.type,
        size: entry.size,
        ignored: entry.ignored,
        children: entry.type === 'directory' ? [] : undefined,
        loaded: false,
        loading: false,
        expanded: false,
      }));

      updateNodes((prev) =>
        updateNodeInTree(prev, path, (n) => ({
          ...n,
          children,
          loaded: true,
          loading: false,
          expanded: true,
        }))
      );
    } catch {
      updateNodes((prev) =>
        updateNodeInTree(prev, path, (n) => ({ ...n, loading: false }))
      );
    }
  };

  const handleToggle = async (node: TreeNode) => {
    if (node.type === 'file') return;

    if (!node.loaded) {
      await handleLoadChildren(node.path);
    } else {
      updateNodes((prev) =>
        updateNodeInTree(prev, node.path, (n) => ({ ...n, expanded: !n.expanded }))
      );
    }
  };

  if (nodes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground px-3 py-4">
        {t('filesPage.emptyDirectory')}
      </p>
    );
  }

  return (
    <div className="text-sm select-none" role="tree">
      <TreeItems
        nodes={nodes}
        depth={0}
        selectedPath={selectedPath}
        onFileSelect={onFileSelect}
        onToggle={handleToggle}
      />
    </div>
  );
}

interface TreeItemsProps {
  nodes: TreeNode[];
  depth: number;
  selectedPath?: string;
  onFileSelect: (path: string) => void;
  onToggle: (node: TreeNode) => Promise<void>;
}

function TreeItems({ nodes, depth, selectedPath, onFileSelect, onToggle }: TreeItemsProps) {
  return (
    <>
      {nodes.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          depth={depth}
          selectedPath={selectedPath}
          onFileSelect={onFileSelect}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}

interface TreeItemProps2 {
  node: TreeNode;
  depth: number;
  selectedPath?: string;
  onFileSelect: (path: string) => void;
  onToggle: (node: TreeNode) => Promise<void>;
}

function TreeItem({ node, depth, selectedPath, onFileSelect, onToggle }: TreeItemProps2) {
  const isSelected = selectedPath === node.path;
  const paddingLeft = depth * 12 + 8;

  const handleClick = () => {
    if (node.type === 'file') {
      onFileSelect(node.path);
    } else {
      void onToggle(node);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div role="treeitem" aria-selected={isSelected} aria-expanded={node.type === 'directory' ? node.expanded : undefined}>
      <div
        className={cn(
          'flex items-center gap-1.5 py-0.5 pr-2 rounded cursor-pointer hover:bg-muted/50 transition-colors',
          isSelected && 'bg-muted text-foreground font-medium'
        )}
        style={{ paddingLeft }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        title={node.path}
      >
        {/* Expand/collapse chevron for directories */}
        {node.type === 'directory' ? (
          <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-muted-foreground">
            {node.loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : node.expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </span>
        ) : (
          <span className="w-4 h-4 flex-shrink-0" />
        )}

        {/* Icon */}
        <FileIcon name={node.name} isDirectory={node.type === 'directory'} isOpen={node.expanded} />

        {/* Name */}
        <span className={cn('truncate text-sm leading-5', node.ignored && 'opacity-50')}>{node.name}</span>
      </div>

      {/* Children */}
      {node.type === 'directory' && node.expanded && node.children && node.children.length > 0 && (
        <TreeItems
          nodes={node.children}
          depth={depth + 1}
          selectedPath={selectedPath}
          onFileSelect={onFileSelect}
          onToggle={onToggle}
        />
      )}
    </div>
  );
}

export function FileExplorer({ rootListing, selectedPath, onFileSelect }: FileExplorerProps) {
  const { t } = useTranslation('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setAllNodes] = useState<TreeNode[]>(() => buildTree(rootListing));
  const [searchResults, setSearchResults] = useState<FileSearchEntry[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isSearching = searchQuery.trim().length > 0;

  // Debounced server-side search
  const performSearch = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await api.searchFiles(query.trim());
        setSearchResults(response.results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
  }, []);

  useEffect(() => {
    performSearch(searchQuery);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, performSearch]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Search input */}
      <div className="px-2 py-1.5 border-b flex-shrink-0">
        <div className="relative flex items-center">
          <Search className="absolute left-2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('filesPage.searchPlaceholder')}
            className="w-full pl-7 pr-7 py-1 text-xs bg-muted/50 border border-border/50 rounded focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring placeholder:text-muted-foreground/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t('filesPage.clearSearch')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* File tree or search results */}
      <div className="flex-1 overflow-y-auto py-1">
        {isSearching ? (
          searchLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <SearchResults
              results={searchResults}
              query={searchQuery}
              selectedPath={selectedPath}
              onFileSelect={onFileSelect}
            />
          )
        ) : (
          <FileTree
            rootListing={rootListing}
            selectedPath={selectedPath}
            onFileSelect={onFileSelect}
            onNodesChange={setAllNodes}
          />
        )}
      </div>
    </div>
  );
}

interface SearchResultsProps {
  results: FileSearchEntry[];
  query: string;
  selectedPath?: string;
  onFileSelect: (path: string) => void;
}

function SearchResults({ results, query, selectedPath, onFileSelect }: SearchResultsProps) {
  const { t } = useTranslation('common');

  if (results.length === 0) {
    return (
      <p className="text-xs text-muted-foreground px-3 py-4 text-center">
        {t('filesPage.noSearchResults')}
      </p>
    );
  }

  return (
    <div className="text-sm select-none">
      {results.map((entry) => {
        const isSelected = selectedPath === entry.path;
        const lowerQuery = query.toLowerCase();
        const lowerName = entry.name.toLowerCase();
        const matchIdx = lowerName.indexOf(lowerQuery);
        const isDirectory = entry.type === 'directory';

        return (
          <div
            key={entry.path}
            className={cn(
              'flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer hover:bg-muted/50 transition-colors',
              isSelected && 'bg-muted text-foreground font-medium',
              entry.ignored && 'opacity-50'
            )}
            onClick={() => { if (!isDirectory) onFileSelect(entry.path); }}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !isDirectory) { e.preventDefault(); onFileSelect(entry.path); }
            }}
            tabIndex={isDirectory ? -1 : 0}
            role="button"
            title={entry.path}
          >
            <FileIcon name={entry.name} isDirectory={isDirectory} />
            <span className="truncate text-sm leading-5 flex-1 min-w-0">
              {matchIdx >= 0 ? (
                <>
                  {entry.name.slice(0, matchIdx)}
                  <mark className="bg-yellow-300/60 dark:bg-yellow-500/40 rounded-sm px-0 text-foreground">
                    {entry.name.slice(matchIdx, matchIdx + query.length)}
                  </mark>
                  {entry.name.slice(matchIdx + query.length)}
                </>
              ) : (
                entry.name
              )}
            </span>
            <span className="text-xs text-muted-foreground truncate hidden sm:block" style={{ maxWidth: 180 }}>
              {entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
