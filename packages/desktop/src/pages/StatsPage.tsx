/**
 * Stats page - Native Tauri implementation
 * 
 * Displays project statistics and analytics using
 * native Tauri commands. (Phase 4 of spec 169)
 */

import { Link, useOutletContext } from 'react-router-dom';
import { useProjectStats } from '../hooks/useSpecs';
import styles from './stats-page.module.css';

interface StatsContext {
  projectId: string;
}

export function StatsPage() {
  const { projectId } = useOutletContext<StatsContext>();
  const { stats, loading, error, refresh } = useProjectStats({ projectId });

  if (loading) {
    return <div className={styles.loading}>Loading statistics…</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Failed to load statistics: {error}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  if (!stats) {
    return <div className={styles.loading}>No statistics available</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Project Statistics</h1>
        <p className={styles.subtitle}>Overview of spec progress and metrics</p>
      </header>

      <main className={styles.content}>
        {/* Overview Cards */}
        <section className={styles.overviewGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.totalSpecs}</div>
            <div className={styles.statLabel}>Total Specs</div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statValue}>{Math.round(stats.completionRate)}%</div>
            <div className={styles.statLabel}>Completion Rate</div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.activeSpecs}</div>
            <div className={styles.statLabel}>Active Specs</div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.totalTags}</div>
            <div className={styles.statLabel}>Total Tags</div>
          </div>
        </section>

        {/* Status Breakdown */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>By Status</h2>
          <div className={styles.statusGrid}>
            {stats.specsByStatus.map(({ status, count }) => (
              <Link 
                key={status} 
                to={`/specs?status=${status}`}
                className={`${styles.statusCard} ${styles[`status-${status}`]}`}
              >
                <div className={styles.statusCount}>{count}</div>
                <div className={styles.statusLabel}>{formatStatus(status)}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Priority Breakdown */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>By Priority</h2>
          <div className={styles.priorityGrid}>
            {stats.specsByPriority.map(({ priority, count }) => (
              <Link 
                key={priority} 
                to={`/specs?priority=${priority}`}
                className={`${styles.priorityCard} ${styles[`priority-${priority}`]}`}
              >
                <div className={styles.priorityCount}>{count}</div>
                <div className={styles.priorityLabel}>{formatPriority(priority)}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Additional Metrics */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Additional Metrics</h2>
          <div className={styles.metricsGrid}>
            <div className={styles.metricItem}>
              <dt>Average Tags per Spec</dt>
              <dd>{stats.avgTagsPerSpec.toFixed(1)}</dd>
            </div>
            <div className={styles.metricItem}>
              <dt>Specs with Dependencies</dt>
              <dd>{stats.specsWithDependencies}</dd>
            </div>
            <div className={styles.metricItem}>
              <dt>Total Projects</dt>
              <dd>{stats.totalProjects}</dd>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    'planned': 'Planned',
    'in-progress': 'In Progress',
    'complete': 'Complete',
    'archived': 'Archived',
  };
  return labels[status] || status;
}

function formatPriority(priority: string): string {
  const labels: Record<string, string> = {
    'critical': 'Critical',
    'high': 'High',
    'medium': 'Medium',
    'low': 'Low',
  };
  return labels[priority] || priority;
}

export default StatsPage;
