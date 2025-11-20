'use client';

import { useState } from 'react';
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
  const [showPicker, setShowPicker] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!path) return;

    try {
      setIsLoading(true);
      const project = await addProject(path);
      await switchProject(project.id);
      toast.success('Project added successfully');
      onOpenChange(false);
      setPath('');
      router.push('/'); // Navigate to dashboard
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add project';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickerSelect = (selectedPath: string) => {
    setPath(selectedPath);
    setShowPicker(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{showPicker ? 'Select Folder' : 'Add Project'}</DialogTitle>
          <DialogDescription>
            {showPicker 
              ? 'Browse and select the project directory.' 
              : 'Enter the absolute path to your local project directory.'}
          </DialogDescription>
        </DialogHeader>
        
        {showPicker ? (
          <DirectoryPicker 
            onSelect={handlePickerSelect} 
            onCancel={() => setShowPicker(false)} 
            initialPath={path}
          />
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
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowPicker(true)}
                    title="Browse folders"
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select the root directory of your project.
                </p>
              </div>
            </div>
            <DialogFooter>
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
