import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Grid3X3,
  List,
  Plus,
  RefreshCw,
  FolderOpen,
  Star,
  ArrowLeft,
} from 'lucide-react';
import type { DesktopProject } from '../types';
import { useProjectsManager, type FilterTab, type SortOption, type ViewMode } from '../hooks/useProjectsManager';
import { ProjectCard } from './ProjectCard';
import { ProjectsTable } from './ProjectsTable';
import styles from './projects-manager.module.css';

interface ProjectsManagerProps {
  projects: DesktopProject[];
  activeProjectId?: string;
  onClose: () => void;
  onOpenProject: (projectId: string) => void;
  onAddProject: () => void;
  onRefresh: () => void;
  onToggleFavorite: (projectId: string) => void;
  onRemoveProject: (projectId: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
}

export function ProjectsManager({
  projects,
  activeProjectId,
  onClose,
  onOpenProject,
  onAddProject,
  onRefresh,
  onToggleFavorite,
  onRemoveProject,
  onRenameProject,
}: ProjectsManagerProps) {
  const manager = useProjectsManager(projects);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // New project
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        onAddProject();
      }
      // Escape to close
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAddProject, onClose]);

  const handleRenameStart = useCallback((projectId: string) => {
    setRenamingProjectId(projectId);
  }, []);

  const handleRenameComplete = useCallback((projectId: string, newName: string) => {
    onRenameProject(projectId, newName);
    setRenamingProjectId(null);
  }, [onRenameProject]);

  const handleRenameCancel = useCallback(() => {
    setRenamingProjectId(null);
  }, []);

  return (
    <div className={styles.projectsManager}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            {activeProject && (
              <button className={styles.backButton} onClick={onClose}>
                <ArrowLeft size={14} />
                Back to {activeProject.name}
              </button>
            )}
            <h1 className={styles.headerTitle}>Projects</h1>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.iconButton}
              onClick={() => manager.validateAllProjects()}
              title="Refresh All Validation"
            >
              <RefreshCw size={16} />
            </button>
            <button className={styles.primaryButton} onClick={onAddProject}>
              <Plus size={16} />
              Add Project
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className={styles.controlsRow}>
          {/* Search */}
          <div className={styles.searchContainer}>
            <Search size={16} className={styles.searchIcon} />
            <input
              ref={searchInputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Search projects..."
              value={manager.searchQuery}
              onChange={(e) => manager.setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${manager.filterTab === 'all' ? styles.tabActive : ''}`}
              onClick={() => manager.setFilterTab('all')}
            >
              All
              <span className={styles.tabCount}>({manager.projectCount})</span>
            </button>
            <button
              className={`${styles.tab} ${manager.filterTab === 'favorites' ? styles.tabActive : ''}`}
              onClick={() => manager.setFilterTab('favorites')}
            >
              <Star size={14} />
              Favorites
              <span className={styles.tabCount}>({manager.favoriteCount})</span>
            </button>
          </div>

          {/* View Controls */}
          <div className={styles.viewControls}>
            <select
              className={styles.sortSelect}
              value={manager.sortBy}
              onChange={(e) => manager.setSortBy(e.target.value as SortOption)}
            >
              <option value="lastAccessed">Last Accessed</option>
              <option value="name">Name</option>
            </select>

            <div className={styles.viewToggle}>
              <button
                className={`${styles.viewButton} ${manager.viewMode === 'grid' ? styles.viewButtonActive : ''}`}
                onClick={() => manager.setViewMode('grid')}
                title="Grid view"
              >
                <Grid3X3 size={16} />
              </button>
              <button
                className={`${styles.viewButton} ${manager.viewMode === 'list' ? styles.viewButtonActive : ''}`}
                onClick={() => manager.setViewMode('list')}
                title="List view"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {manager.filteredProjects.length === 0 ? (
          <EmptyState
            hasProjects={projects.length > 0}
            searchQuery={manager.searchQuery}
            filterTab={manager.filterTab}
            onAddProject={onAddProject}
            onClearSearch={() => manager.setSearchQuery('')}
          />
        ) : manager.viewMode === 'grid' ? (
          <div className={styles.grid}>
            {manager.filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                validationStatus={manager.validationStates[project.id]?.status}
                onOpen={onOpenProject}
                onToggleFavorite={onToggleFavorite}
                onRename={handleRenameStart}
                onRemove={onRemoveProject}
                onValidate={manager.validateProject}
              />
            ))}
          </div>
        ) : (
          <ProjectsTable
            projects={manager.filteredProjects}
            validationStates={manager.validationStates}
            sortBy={manager.sortBy}
            onSortChange={manager.setSortBy}
            onOpen={onOpenProject}
            onToggleFavorite={onToggleFavorite}
            onRename={handleRenameStart}
            onRemove={onRemoveProject}
            onValidate={manager.validateProject}
          />
        )}
      </div>

      {/* Rename Dialog */}
      {renamingProjectId && (
        <RenameDialog
          project={projects.find((p) => p.id === renamingProjectId)!}
          onSave={handleRenameComplete}
          onCancel={handleRenameCancel}
        />
      )}
    </div>
  );
}

interface EmptyStateProps {
  hasProjects: boolean;
  searchQuery: string;
  filterTab: FilterTab;
  onAddProject: () => void;
  onClearSearch: () => void;
}

function EmptyState({ hasProjects, searchQuery, filterTab, onAddProject, onClearSearch }: EmptyStateProps) {
  if (searchQuery) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <Search size={28} />
        </div>
        <h3 className={styles.emptyTitle}>No projects found</h3>
        <p className={styles.emptyDescription}>
          We couldn't find any projects matching "{searchQuery}"
        </p>
        <button className={styles.primaryButton} onClick={onClearSearch}>
          Clear Search
        </button>
      </div>
    );
  }

  if (filterTab === 'favorites') {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <Star size={28} />
        </div>
        <h3 className={styles.emptyTitle}>No favorite projects</h3>
        <p className={styles.emptyDescription}>
          Star projects to see them here for quick access
        </p>
      </div>
    );
  }

  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <FolderOpen size={28} />
      </div>
      <h3 className={styles.emptyTitle}>No Projects Yet</h3>
      <p className={styles.emptyDescription}>
        Get started by adding your first project
      </p>
      <button className={styles.primaryButton} onClick={onAddProject}>
        <Plus size={16} />
        Add Project
      </button>
    </div>
  );
}

interface RenameDialogProps {
  project: DesktopProject;
  onSave: (projectId: string, newName: string) => void;
  onCancel: () => void;
}

function RenameDialog({ project, onSave, onCancel }: RenameDialogProps) {
  const [name, setName] = useState(project.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(project.id, name.trim());
    }
  };

  return createPortal(
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
        }}
        onClick={onCancel}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '400px',
          padding: '24px',
          borderRadius: '16px',
          background: 'rgba(20, 20, 30, 0.98)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          zIndex: 1001,
        }}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600, color: '#fff' }}>
          Rename Project
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              marginBottom: '16px',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'transparent',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || name.trim() === project.name}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#3b82f6',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 500,
                cursor: name.trim() && name.trim() !== project.name ? 'pointer' : 'not-allowed',
                opacity: name.trim() && name.trim() !== project.name ? 1 : 0.5,
              }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}
