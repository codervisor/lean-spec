/**
 * Spec detail page - Native Tauri implementation
 * 
 * Displays a single spec with its content, dependencies, and metadata
 * using native Tauri commands. (Phase 4 of spec 169)
 */

import { useParams, Link, useOutletContext } from 'react-router-dom';
import { useSpecDetail } from '../hooks/useSpecs';
import styles from './spec-detail-page.module.css';

interface SpecContext {
  projectId: string;
}

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

export function SpecDetailPage() {
  const { specId } = useParams<{ specId: string }>();
  const { projectId } = useOutletContext<SpecContext>();
  
  const { spec, dependencies, loading, error, updateStatus } = useSpecDetail({
    projectId,
    specId,
  });

  if (loading) {
    return <div className={styles.loading}>Loading spec…</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Failed to load spec: {error}</p>
        <Link to="/specs">← Back to specs</Link>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className={styles.notFound}>
        <p>Spec not found</p>
        <Link to="/specs">← Back to specs</Link>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus(newStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.breadcrumb}>
          <Link to="/specs">← Specs</Link>
        </div>
        
        <div className={styles.titleSection}>
          <h1 className={styles.title}>
            {spec.specNumber && (
              <span className={styles.specNumber}>#{spec.specNumber.toString().padStart(3, '0')}</span>
            )}
            {spec.title || spec.specName}
          </h1>
          
          {spec.title && spec.title !== spec.specName && (
            <p className={styles.specName}>{spec.specName}</p>
          )}
        </div>

        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <label>Status</label>
            <select 
              value={spec.status} 
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`${styles.statusSelect} ${styles[`status-${spec.status}`]}`}
            >
              <option value="planned">Planned</option>
              <option value="in-progress">In Progress</option>
              <option value="complete">Complete</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          
          {spec.priority && (
            <div className={styles.metaItem}>
              <label>Priority</label>
              <span className={`${styles.priorityBadge} ${styles[`priority-${spec.priority}`]}`}>
                {PRIORITY_LABELS[spec.priority] || spec.priority}
              </span>
            </div>
          )}
          
          {spec.assignee && (
            <div className={styles.metaItem}>
              <label>Assignee</label>
              <span>{spec.assignee}</span>
            </div>
          )}
          
          {spec.updatedAt && (
            <div className={styles.metaItem}>
              <label>Updated</label>
              <span>{new Date(spec.updatedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {spec.tags && spec.tags.length > 0 && (
          <div className={styles.tags}>
            {spec.tags.map(tag => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}
      </header>

      <div className={styles.layout}>
        <main className={styles.content}>
          {spec.contentHtml ? (
            <div 
              className={styles.markdown}
              dangerouslySetInnerHTML={{ __html: spec.contentHtml }}
            />
          ) : (
            <div className={styles.markdownRaw}>
              <pre>{spec.contentMd}</pre>
            </div>
          )}
        </main>

        <aside className={styles.sidebar}>
          {dependencies && (
            <>
              {dependencies.dependsOn.length > 0 && (
                <div className={styles.sidebarSection}>
                  <h3>Depends On</h3>
                  <ul className={styles.dependencyList}>
                    {dependencies.dependsOn.map(dep => (
                      <li key={dep.specName}>
                        <Link to={`/specs/${dep.specName}`}>
                          <span className={styles.depTitle}>{dep.title || dep.specName}</span>
                          <span className={`${styles.depStatus} ${styles[`status-${dep.status}`]}`}>
                            {STATUS_LABELS[dep.status] || dep.status}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {dependencies.requiredBy.length > 0 && (
                <div className={styles.sidebarSection}>
                  <h3>Required By</h3>
                  <ul className={styles.dependencyList}>
                    {dependencies.requiredBy.map(dep => (
                      <li key={dep.specName}>
                        <Link to={`/specs/${dep.specName}`}>
                          <span className={styles.depTitle}>{dep.title || dep.specName}</span>
                          <span className={`${styles.depStatus} ${styles[`status-${dep.status}`]}`}>
                            {STATUS_LABELS[dep.status] || dep.status}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className={styles.sidebarSection}>
            <h3>File Info</h3>
            <dl className={styles.fileInfo}>
              <dt>Path</dt>
              <dd>{spec.filePath}</dd>
              {spec.createdAt && (
                <>
                  <dt>Created</dt>
                  <dd>{new Date(spec.createdAt).toLocaleDateString()}</dd>
                </>
              )}
              {spec.completedAt && (
                <>
                  <dt>Completed</dt>
                  <dd>{new Date(spec.completedAt).toLocaleDateString()}</dd>
                </>
              )}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default SpecDetailPage;
