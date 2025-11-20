'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { addProject, switchProject } = useProject();
  const [path, setPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'picker' | 'manual'>('picker');
  const router = useRouter();

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
      await switchProject(project.id);
      toast.success('Project added successfully');
      onOpenChange(false);
      router.push('/'); // Navigate to dashboard
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add project';
      toast.error(message);
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
          <DialogTitle>Add Project</DialogTitle>
          <DialogDescription>
            {mode === 'picker' 
              ? 'Browse and select the project directory.' 
              : 'Enter the absolute path to your local project directory.'}
          </DialogDescription>
        </DialogHeader>
        
        {mode === 'picker' ? (
          <div className="space-y-2">
            <DirectoryPicker 
              onSelect={handleAddProject} 
              onCancel={() => onOpenChange(false)} 
              initialPath={path}
              actionLabel={isLoading ? "Adding..." : "Add Project"}
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
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="path" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Project Path
                </label>
                <div className="flex gap-2">
                  <Input
                    id="path"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="/path/to/your/project"
                    className="flex-1"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Select the root directory of your project.
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
                  Browse folders
                </Button>
              </div>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !path}>
                {isLoading ? 'Adding...' : 'Add Project'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
