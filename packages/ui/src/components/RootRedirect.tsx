import { Navigate } from 'react-router-dom';
import { useProject } from '../contexts';

const STORAGE_KEY = 'leanspec-current-project';

/**
 * Root redirect component that navigates to the appropriate page:
 * - If a project is stored in localStorage and exists, navigate to that project's dashboard
 * - Otherwise, navigate to the projects list page
 */
export function RootRedirect() {
  const { currentProject, projects, loading } = useProject();

  if (loading) {
    // Show nothing while loading to avoid flash of redirect
    return null;
  }

  // If we have a current project, navigate to it
  if (currentProject?.id) {
    return <Navigate to={`/projects/${currentProject.id}`} replace />;
  }

  // Check if there's a stored project ID
  const storedId = localStorage.getItem(STORAGE_KEY);
  if (storedId) {
    const storedProject = projects.find((p) => p.id === storedId);
    if (storedProject) {
      return <Navigate to={`/projects/${storedProject.id}`} replace />;
    }
  }

  // If there are any projects, navigate to the first one
  if (projects.length > 0) {
    return <Navigate to={`/projects/${projects[0].id}`} replace />;
  }

  // No projects, go to projects page
  return <Navigate to="/projects" replace />;
}
