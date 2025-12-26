import { useEffect, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@leanspec/ui-components';
import { useProject } from '../../contexts';
import { DirectoryPicker } from './DirectoryPicker.tsx';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { addProject } = useProject();
  const [path, setPath] = useState('');
  const [mode, setMode] = useState<'picker' | 'manual'>('picker');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode('picker');
      setPath('');
      setError(null);
    }
  }, [open]);

  const handleAddProject = async (projectPath: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const project = await addProject(projectPath);
      onOpenChange(false);
      // Full reload to ensure new project context propagates everywhere
      if (project?.id) {
        window.location.assign(`/projects/${project.id}/specs`);
      } else {
        window.location.assign('/');
      }
      return project;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!path.trim()) {
      setError('Project path is required');
      return;
    }
    void handleAddProject(path.trim());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError(null);
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            {mode === 'picker'
              ? 'Choose a project directory to add to LeanSpec.'
              : 'Enter the path to your project directory.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'picker' ? (
          <div className="space-y-2 min-w-0 overflow-hidden">
            <DirectoryPicker
              onSelect={handleAddProject}
              onCancel={() => onOpenChange(false)}
              initialPath={path}
              actionLabel={isLoading ? 'Adding…' : 'Add Project'}
              isLoading={isLoading}
            />
            <div className="flex justify-center">
              <Button
                variant="link"
                size="sm"
                onClick={() => setMode('manual')}
                className="text-muted-foreground"
              >
                Enter path manually
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <label
                htmlFor="project-path"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Project path
              </label>
              <div className="flex gap-2">
                <Input
                  id="project-path"
                  value={path}
                  onChange={(event) => setPath(event.target.value)}
                  placeholder="/path/to/project"
                  className="flex-1"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The directory must contain your spec files.
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <div className="flex-1 flex justify-start">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode('picker')}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Browse folders
                </Button>
              </div>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !path.trim()}>
                {isLoading ? 'Adding…' : 'Add Project'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
