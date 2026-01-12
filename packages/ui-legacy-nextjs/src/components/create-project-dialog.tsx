'use client';

import { useState, useEffect } from 'react';
import { useProject } from '@/contexts/project-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DirectoryPicker } from './directory-picker';
import { FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { addProject } = useProject();
  const [path, setPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'picker' | 'manual'>('picker');
  const { t } = useTranslation('common');

  useEffect(() => {
    if (open) {
      setMode('picker');
      setPath('');
    }
  }, [open]);

  const handleAddProject = async (projectPath: string) => {
    try {
      setIsLoading(true);
      const project = await addProject(projectPath);
      toast.success(t('createProject.toastSuccess'));
      onOpenChange(false);
      // Full page navigation - ensures clean state for new project
      window.location.href = `/projects/${project.id}/specs`;
    } catch (error) {
      const message = error instanceof Error ? error.message : t('createProject.toastError');
      toast.error(t('createProject.toastError'), { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!path) return;
    handleAddProject(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="path" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {t('createProject.pathLabel')}
                </label>
                <div className="flex gap-2">
                  <Input
                    id="path"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder={t('createProject.pathPlaceholder')}
                    className="flex-1"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('createProject.pathHelp')}
                </p>
              </div>
            </div>
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
              <Button type="submit" disabled={isLoading || !path}>
                {isLoading ? t('createProject.adding') : t('createProject.action')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
