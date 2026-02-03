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
import { useProjectMutations } from '../../hooks/useProjectQuery';
import { DirectoryPicker } from './DirectoryPicker';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { addProject } = useProjectMutations();
  const navigate = useNavigate();
  const [path, setPath] = useState('');
  const [mode, setMode] = useState<'picker' | 'manual'>('picker');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation('common');

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
      if (project?.id) {
        navigate(`/projects/${project.id}/specs`);
      } else {
        navigate('/');
      }
      return project;
    } catch (err) {
      const message = err instanceof Error ? err.message : t('createProject.toastError');
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!path.trim()) {
      setError(t('createProject.pathRequired'));
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
          <DialogTitle>{t('createProject.title')}</DialogTitle>
          <DialogDescription>
            {mode === 'picker'
              ? t('createProject.descriptionPicker')
              : t('createProject.descriptionManual')}
          </DialogDescription>
        </DialogHeader>

        {mode === 'picker' ? (
          <div className="space-y-2 min-w-0 overflow-hidden">
            <DirectoryPicker
              onSelect={handleAddProject}
              onCancel={() => onOpenChange(false)}
              initialPath={path}
              actionLabel={isLoading ? t('createProject.adding') : t('createProject.action')}
              isLoading={isLoading}
            />
            <div className="flex justify-center">
              <Button
                variant="link"
                size="sm"
                onClick={() => setMode('manual')}
                className="text-muted-foreground"
              >
                {t('createProject.enterManually')}
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
                {t('createProject.pathLabel')}
              </label>
              <div className="flex gap-2">
                <Input
                  id="project-path"
                  value={path}
                  onChange={(event) => setPath(event.target.value)}
                  placeholder={t('createProject.pathPlaceholder')}
                  className="flex-1"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('createProject.pathHelp')}
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
                  {t('createProject.browseFolders')}
                </Button>
              </div>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                {t('actions.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading || !path.trim()}>
                {isLoading ? t('createProject.adding') : t('createProject.action')}
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
