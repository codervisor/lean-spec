/**
 * Specs list page - Native Tauri implementation
 * 
 * This page displays all specs for the active project using
 * native Tauri commands instead of Next.js API routes.
 * (Phase 4 of spec 169)
 */

import { useState, useMemo, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useSpecs } from '../hooks/useSpecs';
import { useProjectStats } from '../hooks/useSpecs';
import type { LightweightSpec } from '../types';
import styles from './specs-page.module.css';

interface SpecsContext {
  projectId: string;
  refreshProjects: () => void;
}

type ViewMode = 'list' | 'board';
type SortBy = 'id-desc' | 'id-asc' | 'updated-desc' | 'title-asc';
type SpecStatus = 'planned' | 'in-progress' | 'complete' | 'archived';

const STATUS_LABELS: Record<string, string> = {
  'planned': 'Planned',
  'in-progress': 'In Progress',
  'complete': 'Complete',
  'archived': 'Archived',
};

const PRIORITY_LABELS: Record<string, string> = {
  'critical': 'Critical',
  'high': 'High',
  'medium': 'Medium',
  'low': 'Low',
};

export function SpecsPage() {
  const { projectId } = useOutletContext<SpecsContext>();
  const { specs, loading, error, refresh } = useSpecs({ projectId });
  const { stats } = useProjectStats({ projectId });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SpecStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('id-desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const filteredAndSortedSpecs = useMemo(() => {
    const filtered = specs.filter(spec => {
      const matchesSearch = !searchQuery ||
        spec.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spec.specName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spec.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all'
        ? (viewMode === 'list' ? spec.status !== 'archived' : true)
        : spec.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || spec.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    const sorted = [...filtered];

    switch (sortBy) {
      case 'id-desc':
        sorted.sort((a, b) => (b.specNumber || 0) - (a.specNumber || 0));
        break;
      case 'id-asc':
        sorted.sort((a, b) => (a.specNumber || 0) - (b.specNumber || 0));
        break;
      case 'updated-desc':
        sorted.sort((a, b) => {
          if (!a.updatedAt) return 1;
          if (!b.updatedAt) return -1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        break;
      case 'title-asc':
        sorted.sort((a, b) => {
          const titleA = (a.title || a.specName).toLowerCase();
          const titleB = (b.title || b.specName).toLowerCase();
          return titleA.localeCompare(titleB);
        });
        break;
    }
    return sorted;
  }, [specs, searchQuery, statusFilter, priorityFilter, sortBy, viewMode]);

  if (loading) {
    return <div className={styles.loading}>Loading specs…</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Failed to load specs: {error}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Specs</h1>
          <p className={styles.count}>{filteredAndSortedSpecs.length} specs</p>
        </div>

        {stats && (
          <div className={styles.statsBar}>
            <span>Total: {stats.totalSpecs}</span>
            <span>Completion: {Math.round(stats.completionRate)}%</span>
            <span>Active: {stats.activeSpecs}</span>
          </div>
        )}

        <div className={styles.controls}>
          <div className={styles.viewToggle}>
            <button 
              className={viewMode === 'list' ? styles.active : ''} 
              onClick={() => setViewMode('list')}
            >
              List
            </button>
            <button 
              className={viewMode === 'board' ? styles.active : ''} 
              onClick={() => setViewMode('board')}
            >
              Board
            </button>
          </div>

          <input
            type="text"
            placeholder="Search specs…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as SpecStatus | 'all')}
            className={styles.select}
          >
            <option value="all">All Status</option>
            <option value="planned">Planned</option>
            <option value="in-progress">In Progress</option>
            <option value="complete">Complete</option>
            <option value="archived">Archived</option>
          </select>

          <select 
            value={priorityFilter} 
            onChange={(e) => setPriorityFilter(e.target.value)}
            className={styles.select}
          >
            <option value="all">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className={styles.select}
          >
            <option value="id-desc">ID (Newest)</option>
            <option value="id-asc">ID (Oldest)</option>
            <option value="updated-desc">Recently Updated</option>
            <option value="title-asc">Title (A-Z)</option>
          </select>
        </div>
      </header>

      <main className={styles.content}>
        {viewMode === 'list' ? (
          <ListView specs={filteredAndSortedSpecs} />
        ) : (
          <BoardView specs={filteredAndSortedSpecs} projectId={projectId} />
        )}
      </main>
    </div>
  );
}

function ListView({ specs }: { specs: LightweightSpec[] }) {
  return (
    <div className={styles.listView}>
      {specs.map(spec => (
        <SpecCard key={spec.id} spec={spec} />
      ))}
      {specs.length === 0 && (
        <div className={styles.emptyState}>No specs found</div>
      )}
    </div>
  );
}

function BoardView({ specs, projectId }: { specs: LightweightSpec[]; projectId: string }) {
  const columns: SpecStatus[] = ['planned', 'in-progress', 'complete', 'archived'];
  
  const specsByStatus = useMemo(() => {
    const grouped: Record<SpecStatus, LightweightSpec[]> = {
      'planned': [],
      'in-progress': [],
      'complete': [],
      'archived': [],
    };
    
    specs.forEach(spec => {
      const status = spec.status as SpecStatus;
      if (grouped[status]) {
        grouped[status].push(spec);
      }
    });
    
    return grouped;
  }, [specs]);

  return (
    <div className={styles.boardView}>
      {columns.map(status => (
        <div key={status} className={styles.boardColumn}>
          <div className={styles.columnHeader}>
            <span className={styles.columnTitle}>{STATUS_LABELS[status]}</span>
            <span className={styles.columnCount}>{specsByStatus[status].length}</span>
          </div>
          <div className={styles.columnContent}>
            {specsByStatus[status].map(spec => (
              <SpecCard key={spec.id} spec={spec} compact />
            ))}
            {specsByStatus[status].length === 0 && (
              <div className={styles.emptyColumn}>No specs</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SpecCard({ spec, compact = false }: { spec: LightweightSpec; compact?: boolean }) {
  const specUrl = `/specs/${spec.specNumber || spec.specName}`;
  
  const priorityClass = spec.priority ? styles[`priority-${spec.priority}`] : '';
  
  return (
    <Link to={specUrl} className={`${styles.specCard} ${priorityClass} ${compact ? styles.compact : ''}`}>
      <div className={styles.cardHeader}>
        {spec.specNumber && (
          <span className={styles.specNumber}>#{spec.specNumber.toString().padStart(3, '0')}</span>
        )}
        <span className={styles.specTitle}>{spec.title || spec.specName}</span>
      </div>
      
      {!compact && spec.title && spec.title !== spec.specName && (
        <p className={styles.specName}>{spec.specName}</p>
      )}
      
      <div className={styles.cardMeta}>
        <span className={`${styles.statusBadge} ${styles[`status-${spec.status}`]}`}>
          {STATUS_LABELS[spec.status] || spec.status}
        </span>
        {spec.priority && (
          <span className={`${styles.priorityBadge} ${styles[`priority-${spec.priority}`]}`}>
            {PRIORITY_LABELS[spec.priority] || spec.priority}
          </span>
        )}
      </div>
      
      {!compact && spec.tags && spec.tags.length > 0 && (
        <div className={styles.tags}>
          {spec.tags.slice(0, 3).map(tag => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
          {spec.tags.length > 3 && (
            <span className={styles.tagMore}>+{spec.tags.length - 3}</span>
          )}
        </div>
      )}
      
      {!compact && (
        <div className={styles.cardFooter}>
          {spec.dependsOn && spec.dependsOn.length > 0 && (
            <span className={styles.dependency}>
              {spec.dependsOn.length} dep{spec.dependsOn.length !== 1 ? 's' : ''}
            </span>
          )}
          {spec.subSpecsCount && spec.subSpecsCount > 0 && (
            <span className={styles.subSpecs}>
              {spec.subSpecsCount} file{spec.subSpecsCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

export default SpecsPage;
