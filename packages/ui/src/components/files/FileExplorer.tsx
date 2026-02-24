/**
 * FileExplorer - collapsible directory tree for codebase browsing
 * Spec 246 - Codebase File Viewing in @leanspec/ui
 */

import { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen, Loader2 } from 'lucide-react';
import { cn } from '@/library';
import { useTranslation } from 'react-i18next';
import type { FileListResponse } from '../../types/api';
import { api } from '../../lib/api';

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
    children: entry.type === 'directory' ? [] : undefined,
    loaded: false,
    loading: false,
    expanded: false,
  }));
}

function fileIconClass(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'text-blue-500';
    case 'js':
    case 'jsx':
    case 'mjs':
      return 'text-yellow-500';
    case 'rs':
      return 'text-orange-500';
    case 'py':
      return 'text-green-500';
    case 'json':
    case 'yaml':
    case 'yml':
    case 'toml':
      return 'text-purple-400';
    case 'md':
    case 'mdx':
      return 'text-sky-400';
    case 'css':
    case 'scss':
      return 'text-pink-400';
    default:
      return 'text-muted-foreground';
  }
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
}

export function FileTree({ rootListing, selectedPath, onFileSelect }: FileTreeProps) {
  const [nodes, setNodes] = useState<TreeNode[]>(() => buildTree(rootListing));
  const { t } = useTranslation('common');

  const handleLoadChildren = async (path: string) => {
    // Mark loading
    setNodes((prev) =>
      updateNodeInTree(prev, path, (n) => ({ ...n, loading: true }))
    );

    try {
      const listing = await api.getFiles(path);
      const children = listing.entries.map<TreeNode>((entry) => ({
        name: entry.name,
        path: path + '/' + entry.name,
        type: entry.type,
        size: entry.size,
        children: entry.type === 'directory' ? [] : undefined,
        loaded: false,
        loading: false,
        expanded: false,
      }));

      setNodes((prev) =>
        updateNodeInTree(prev, path, (n) => ({
          ...n,
          children,
          loaded: true,
          loading: false,
          expanded: true,
        }))
      );
    } catch {
      setNodes((prev) =>
        updateNodeInTree(prev, path, (n) => ({ ...n, loading: false }))
      );
    }
  };

  const handleToggle = async (node: TreeNode) => {
    if (node.type === 'file') return;

    if (!node.loaded) {
      await handleLoadChildren(node.path);
    } else {
      setNodes((prev) =>
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
        {node.type === 'directory' ? (
          node.expanded ? (
            <FolderOpen className="w-4 h-4 flex-shrink-0 text-amber-500" />
          ) : (
            <Folder className="w-4 h-4 flex-shrink-0 text-amber-500" />
          )
        ) : (
          <FileText className={cn('w-4 h-4 flex-shrink-0', fileIconClass(node.name))} />
        )}

        {/* Name */}
        <span className="truncate text-sm leading-5">{node.name}</span>
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
  return (
    <div className="h-full overflow-y-auto py-2">
      <FileTree
        rootListing={rootListing}
        selectedPath={selectedPath}
        onFileSelect={onFileSelect}
      />
    </div>
  );
}
