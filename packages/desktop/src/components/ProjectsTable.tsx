import { useCallback } from 'react';
import {
  Star,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import type { DesktopProject } from '../types';
import type { SortOption, ProjectValidationState } from '../hooks/useProjectsManager';
import styles from './projects-manager.module.css';

// Generate avatar color from project name
function getAvatarColor(name: string): string {
  const colors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#6366f1',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Get initials from project name
function getInitials(name: string): string {
  return name
    .split(/[-_\s]+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  return `${diffMonth}mo ago`;
}

interface ProjectsTableProps {
  projects: DesktopProject[];
  validationStates: Record<string, ProjectValidationState>;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onOpen: (projectId: string) => void;
  onToggleFavorite: (projectId: string) => void;
  onRename: (projectId: string) => void;
  onRemove: (projectId: string) => void;
  onValidate: (projectId: string) => void;
}

export function ProjectsTable({
  projects,
  validationStates,
  sortBy,
  onSortChange,
  onOpen,
  onToggleFavorite,
  onRename: _onRename,
  onRemove,
  onValidate,
}: ProjectsTableProps) {
  const handleHeaderClick = useCallback((column: SortOption) => {
    onSortChange(column);
  }, [onSortChange]);

  const renderSortIcon = (column: SortOption) => {
    if (sortBy !== column) return null;
    return <ChevronDown size={14} />;
  };

  const renderValidationIcon = (projectId: string) => {
    const state = validationStates[projectId];
    if (!state) return null;

    switch (state.status) {
      case 'valid':
        return <CheckCircle2 size={14} style={{ color: '#22c55e' }} />;
      case 'invalid':
        return <AlertTriangle size={14} style={{ color: '#ef4444' }} />;
      case 'validating':
        return <RefreshCw size={14} className={styles.spin} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />;
      default:
        return null;
    }
  };

  return (
    <table className={styles.table}>
      <thead className={styles.tableHeader}>
        <tr>
          <th style={{ width: '40px' }}>★</th>
          <th onClick={() => handleHeaderClick('name')}>
            <span className={styles.sortableHeader}>
              Name
              {renderSortIcon('name')}
            </span>
          </th>
          <th>Path</th>
          <th style={{ width: '100px' }}>Status</th>
          <th onClick={() => handleHeaderClick('lastAccessed')} style={{ width: '120px' }}>
            <span className={styles.sortableHeader}>
              Last Accessed
              {renderSortIcon('lastAccessed')}
            </span>
          </th>
          <th style={{ width: '80px' }}></th>
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => {
          const avatarColor = project.color || getAvatarColor(project.name);
          const initials = getInitials(project.name);
          const relativeTime = formatRelativeTime(project.lastAccessed);

          return (
            <tr
              key={project.id}
              className={styles.tableRow}
              onClick={() => onOpen(project.id)}
            >
              <td>
                <button
                  className={styles.tableActionButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(project.id);
                  }}
                  style={{ margin: '0 auto' }}
                >
                  <Star
                    size={14}
                    fill={project.favorite ? '#fbbf24' : 'none'}
                    color={project.favorite ? '#fbbf24' : 'currentColor'}
                  />
                </button>
              </td>
              <td>
                <div className={styles.tableNameCell}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: avatarColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <span style={{ fontWeight: 500 }}>{project.name}</span>
                </div>
              </td>
              <td>
                <span className={styles.tablePath} title={project.path}>
                  {project.path}
                </span>
              </td>
              <td>{renderValidationIcon(project.id)}</td>
              <td>
                <span className={styles.tableTime}>{relativeTime}</span>
              </td>
              <td>
                <div className={styles.tableActions}>
                  <button
                    className={styles.tableActionButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      onValidate(project.id);
                    }}
                    title="Refresh validation"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    className={styles.tableActionButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(project.id);
                    }}
                    title="Remove from list"
                  >
                    <MoreVertical size={14} />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
