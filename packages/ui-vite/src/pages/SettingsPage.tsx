import { useState } from 'react';
import { Folder, RefreshCw } from 'lucide-react';
import { useProject } from '../contexts';

export function SettingsPage() {
  const { currentProject, availableProjects, loading, error, switchProject, refreshProjects } = useProject();
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const handleSwitchProject = async (projectId: string) => {
    if (projectId === currentProject?.id) return;
    
    setSwitching(true);
    setSwitchError(null);
    try {
      await switchProject(projectId);
      // Reload the page to refresh all data
      window.location.reload();
    } catch (err: any) {
      setSwitchError(err.message);
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading settings...</div>;
  }

  const displayError = switchError || error;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Settings</h2>
        <button
          onClick={refreshProjects}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {displayError && (
        <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
          Error: {displayError}
        </div>
      )}

      {/* Project Management */}
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Project</h3>
        
        {currentProject && (
          <div className="mb-6 p-4 bg-secondary rounded-lg">
            <div className="flex items-center gap-3">
              <Folder className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <div className="font-medium">{currentProject.name}</div>
                <div className="text-sm text-muted-foreground">{currentProject.path}</div>
              </div>
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                Current
              </span>
            </div>
          </div>
        )}

        {availableProjects && availableProjects.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Available Projects</h4>
            <div className="space-y-2">
              {availableProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <Folder className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{project.name}</div>
                    <div className="text-xs text-muted-foreground">{project.path}</div>
                  </div>
                  <button
                    onClick={() => handleSwitchProject(project.id)}
                    disabled={switching || project.id === currentProject?.id}
                    className="px-3 py-1 text-sm border rounded hover:bg-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {project.id === currentProject?.id ? 'Current' : 'Switch'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!availableProjects || availableProjects.length === 0) && (
          <p className="text-sm text-muted-foreground">
            No other projects available. Projects are discovered from recent workspaces.
          </p>
        )}
      </div>

      {/* Additional Settings Sections (Placeholders) */}
      <div className="mt-6 border rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Theme and display settings will be added in Phase 6.
        </p>
      </div>

      <div className="mt-6 border rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Advanced</h3>
        <p className="text-sm text-muted-foreground">
          Advanced configuration options will be added in Phase 6.
        </p>
      </div>
    </div>
  );
}
