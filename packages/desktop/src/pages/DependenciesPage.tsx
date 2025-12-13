/**
 * Dependencies page - Native Tauri implementation
 * 
 * Displays the dependency graph visualization using
 * native Tauri commands. (Phase 4 of spec 169)
 */

import { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useDependencyGraph } from '../hooks/useSpecs';
import styles from './dependencies-page.module.css';

interface DepsContext {
  projectId: string;
}

export function DependenciesPage() {
  const { projectId } = useOutletContext<DepsContext>();
  const { graph, loading, error, refresh } = useDependencyGraph({ projectId });

  const nodesByStatus = useMemo(() => {
    if (!graph) return {};
    
    const grouped: Record<string, typeof graph.nodes> = {};
    graph.nodes.forEach(node => {
      const status = node.status || 'unknown';
      if (!grouped[status]) grouped[status] = [];
      grouped[status].push(node);
    });
    return grouped;
  }, [graph]);

  if (loading) {
    return <div className={styles.loading}>Loading dependency graph…</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Failed to load dependency graph: {error}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  if (!graph) {
    return <div className={styles.loading}>No dependency data available</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dependencies</h1>
        <p className={styles.subtitle}>
          {graph.nodes.length} specs with {graph.edges.length} dependencies
        </p>
      </header>

      <main className={styles.content}>
        {/* Summary Stats */}
        <section className={styles.summary}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{graph.nodes.length}</div>
            <div className={styles.statLabel}>Specs</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{graph.edges.length}</div>
            <div className={styles.statLabel}>Dependencies</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {graph.nodes.filter(n => 
                graph.edges.some(e => e.source === n.id || e.target === n.id)
              ).length}
            </div>
            <div className={styles.statLabel}>Connected Specs</div>
          </div>
        </section>

        {/* Dependency List by Status */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Specs by Status</h2>
          
          {Object.entries(nodesByStatus).map(([status, nodes]) => (
            <div key={status} className={styles.statusGroup}>
              <h3 className={`${styles.statusHeader} ${styles[`status-${status}`]}`}>
                {formatStatus(status)} ({nodes.length})
              </h3>
              <div className={styles.nodeList}>
                {nodes.map(node => {
                  const dependsOn = graph.edges.filter(e => e.source === node.id);
                  const requiredBy = graph.edges.filter(e => e.target === node.id);
                  
                  return (
                    <div key={node.id} className={styles.nodeCard}>
                      <Link to={`/specs/${node.name}`} className={styles.nodeTitle}>
                        #{node.number.toString().padStart(3, '0')} {node.name}
                      </Link>
                      
                      <div className={styles.nodeMeta}>
                        {node.priority && (
                          <span className={`${styles.priority} ${styles[`priority-${node.priority}`]}`}>
                            {node.priority}
                          </span>
                        )}
                        {node.tags.length > 0 && (
                          <span className={styles.tagCount}>{node.tags.length} tags</span>
                        )}
                      </div>
                      
                      <div className={styles.connections}>
                        {dependsOn.length > 0 && (
                          <div className={styles.connectionGroup}>
                            <span className={styles.connectionLabel}>Depends on:</span>
                            <span className={styles.connectionList}>
                              {dependsOn.map(e => {
                                const target = graph.nodes.find(n => n.id === e.target);
                                return target ? (
                                  <Link key={e.target} to={`/specs/${target.name}`} className={styles.connectionLink}>
                                    #{target.number}
                                  </Link>
                                ) : null;
                              })}
                            </span>
                          </div>
                        )}
                        {requiredBy.length > 0 && (
                          <div className={styles.connectionGroup}>
                            <span className={styles.connectionLabel}>Required by:</span>
                            <span className={styles.connectionList}>
                              {requiredBy.map(e => {
                                const source = graph.nodes.find(n => n.id === e.source);
                                return source ? (
                                  <Link key={e.source} to={`/specs/${source.name}`} className={styles.connectionLink}>
                                    #{source.number}
                                  </Link>
                                ) : null;
                              })}
                            </span>
                          </div>
                        )}
                        {dependsOn.length === 0 && requiredBy.length === 0 && (
                          <span className={styles.noConnections}>No dependencies</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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
    'unknown': 'Unknown',
  };
  return labels[status] || status;
}

export default DependenciesPage;
