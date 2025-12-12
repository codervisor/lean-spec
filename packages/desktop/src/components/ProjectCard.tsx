import { useState, useCallback, useMemo, type MouseEvent } from 'react';
import { 
  Star, 
  MoreVertical, 
  FolderOpen, 
  Pencil, 
  Trash2, 
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import type { DesktopProject } from '../types';
import type { ValidationStatus } from '../hooks/useProjectsManager';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import styles from './project-card.module.css';

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

interface ProjectCardProps {
  project: DesktopProject;
  validationStatus?: ValidationStatus;
  onOpen: (projectId: string) => void;
  onToggleFavorite: (projectId: string) => void;
  onRename: (projectId: string) => void;
  onRemove: (projectId: string) => void;
  onValidate: (projectId: string) => void;
}

export function ProjectCard({
  project,
  validationStatus = 'unknown',
  onOpen,
  onToggleFavorite,
  onRename,
  onRemove,
  onValidate,
}: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const avatarColor = useMemo(() => project.color || getAvatarColor(project.name), [project.color, project.name]);
  const initials = useMemo(() => getInitials(project.name), [project.name]);
  const relativeTime = useMemo(() => formatRelativeTime(project.lastAccessed), [project.lastAccessed]);

  const handleCardClick = useCallback(() => {
    onOpen(project.id);
  }, [onOpen, project.id]);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  }, []);

  const handleMenuClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPosition({ x: rect.left, y: rect.bottom + 4 });
    setShowMenu((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setShowMenu(false);
  }, []);

  const handleReveal = useCallback(async () => {
    closeMenu();
    try {
      await revealItemInDir(project.path);
    } catch (error) {
      console.error('Failed to reveal in finder:', error);
    }
  }, [closeMenu, project.path]);

  const handleToggleFavorite = useCallback(() => {
    closeMenu();
    onToggleFavorite(project.id);
  }, [closeMenu, onToggleFavorite, project.id]);

  const handleRename = useCallback(() => {
    closeMenu();
    onRename(project.id);
  }, [closeMenu, onRename, project.id]);

  const handleRemove = useCallback(() => {
    closeMenu();
    onRemove(project.id);
  }, [closeMenu, onRemove, project.id]);

  const handleValidate = useCallback(() => {
    closeMenu();
    onValidate(project.id);
  }, [closeMenu, onValidate, project.id]);

  const renderValidationIcon = () => {
    switch (validationStatus) {
      case 'valid':
        return <CheckCircle2 size={14} className={styles.validIcon} />;
      case 'invalid':
        return <AlertTriangle size={14} className={styles.invalidIcon} />;
      case 'validating':
        return <RefreshCw size={14} className={`${styles.validatingIcon} ${styles.spin}`} />;
      default:
        return null;
    }
  };

  return (
    <>
      <div
        className={styles.card}
        onClick={handleCardClick}
        onContextMenu={handleContextMenu}
        tabIndex={0}
        role="button"
        aria-label={`Open ${project.name}`}
      >
        <div className={styles.cardHeader}>
          <div className={styles.cardInfo}>
            <div className={styles.avatar} style={{ backgroundColor: avatarColor }}>
              {initials}
            </div>
            <div className={styles.cardDetails}>
              <h3 className={styles.cardName}>
                <span className={styles.cardNameText}>{project.name}</span>
                <span className={styles.validationIcon}>{renderValidationIcon()}</span>
              </h3>
              <p className={styles.cardPath} title={project.path}>
                {project.path}
              </p>
            </div>
          </div>
          <div className={styles.cardActions}>
            <button
              className={styles.cardActionButton}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFavorite();
              }}
              title={project.favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star size={16} fill={project.favorite ? '#fbbf24' : 'none'} color={project.favorite ? '#fbbf24' : 'currentColor'} />
            </button>
            <button
              className={styles.cardActionButton}
              onClick={handleMenuClick}
              title="More actions"
            >
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        <div className={styles.cardStats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Specs</span>
            <span className={styles.statValue}>—</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statLabel}>Status</span>
            <span className={styles.statValue}>{validationStatus === 'valid' ? '✓' : validationStatus === 'invalid' ? '✗' : '—'}</span>
          </div>
        </div>

        <div className={styles.cardFooter}>
          <div className={styles.footerLeft}>
            <div className={styles.colorDot} style={{ backgroundColor: avatarColor }} />
            <span className={styles.footerLabel}>Local</span>
          </div>
          <span className={styles.footerTime}>{relativeTime}</span>
        </div>

        {project.favorite && (
          <div className={styles.favoriteCorner}>
            <div className={styles.favoriteBadge}>
              <Star size={12} className={styles.starFilled} fill="#fbbf24" />
            </div>
          </div>
        )}
      </div>

      {showMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={closeMenu}
          />
          <div
            className={styles.contextMenu}
            style={{
              position: 'fixed',
              left: menuPosition.x,
              top: menuPosition.y,
            }}
          >
            <button className={styles.contextMenuItem} onClick={handleCardClick}>
              <FolderOpen size={16} />
              Open
              <span className={styles.shortcut}>↵</span>
            </button>
            <button className={styles.contextMenuItem} onClick={handleToggleFavorite}>
              <Star size={16} />
              {project.favorite ? 'Unfavorite' : 'Favorite'}
              <span className={styles.shortcut}>Space</span>
            </button>
            <div className={styles.contextMenuDivider} />
            <button className={styles.contextMenuItem} onClick={handleRename}>
              <Pencil size={16} />
              Rename…
            </button>
            <button className={styles.contextMenuItem} onClick={handleReveal}>
              <ExternalLink size={16} />
              Reveal in Finder
              <span className={styles.shortcut}>⌘R</span>
            </button>
            <div className={styles.contextMenuDivider} />
            <button className={styles.contextMenuItem} onClick={handleValidate}>
              <RefreshCw size={16} />
              Refresh Validation
            </button>
            <button className={`${styles.contextMenuItem} ${styles.contextMenuItemDanger}`} onClick={handleRemove}>
              <Trash2 size={16} />
              Remove from List
              <span className={styles.shortcut}>⌫</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}

// Spin animation style
const spinStyle = document.createElement('style');
spinStyle.textContent = `
  .${styles.spin} {
    animation: projectCardSpin 1s linear infinite;
  }
  @keyframes projectCardSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('project-card-spin-style')) {
  spinStyle.id = 'project-card-spin-style';
  document.head.appendChild(spinStyle);
}
