import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

export interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (path: string) => Promise<void> | void;
  onBrowseFolder?: () => Promise<string | null>;
  isLoading?: boolean;
  labels?: {
    title?: string;
    descriptionPicker?: string;
    descriptionManual?: string;
    pathLabel?: string;
    pathPlaceholder?: string;
    pathHelp?: string;
    action?: string;
    adding?: string;
    cancel?: string;
    browseFolders?: string;
    enterManually?: string;
  };
}

export function ProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  onBrowseFolder,
  isLoading = false,
  labels,
}: ProjectDialogProps) {
  const [path, setPath] = useState('');
  const [mode, setMode] = useState<'picker' | 'manual'>(onBrowseFolder ? 'picker' : 'manual');
  const [isBrowsing, setIsBrowsing] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(onBrowseFolder ? 'picker' : 'manual');
      setPath('');
    }
  }, [open, onBrowseFolder]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!path) return;
    await onSubmit(path);
  };

  const handleBrowse = async () => {
    if (!onBrowseFolder) return;
    setIsBrowsing(true);
    try {
      const selectedPath = await onBrowseFolder();
      if (selectedPath) {
        setPath(selectedPath);
        setMode('manual');
      }
    } finally {
      setIsBrowsing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{labels?.title || 'Create Project'}</DialogTitle>
          <DialogDescription>
            {mode === 'picker' 
              ? (labels?.descriptionPicker || 'Browse and select a folder containing your specs')
              : (labels?.descriptionManual || 'Enter the path to your specs folder')}
          </DialogDescription>
        </DialogHeader>
        
        {mode === 'picker' && onBrowseFolder ? (
          <div className="space-y-4">
            <Button 
              onClick={handleBrowse}
              disabled={isBrowsing || isLoading}
              className="w-full"
              size="lg"
            >
              <FolderOpen className="mr-2 h-5 w-5" />
              {isBrowsing ? 'Browsing...' : (labels?.browseFolders || 'Browse Folders')}
            </Button>
            <div className="flex justify-center">
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => setMode('manual')}
                className="text-muted-foreground"
              >
                {labels?.enterManually || 'Enter path manually'}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="path" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {labels?.pathLabel || 'Project Path'}
                </label>
                <div className="flex gap-2">
                  <Input
                    id="path"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder={labels?.pathPlaceholder || '/path/to/your/project'}
                    className="flex-1"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {labels?.pathHelp || 'The folder should contain a specs/ directory'}
                </p>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              {onBrowseFolder && (
                <div className="flex-1 flex justify-start">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setMode('picker')}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    {labels?.browseFolders || 'Browse Folders'}
                  </Button>
                </div>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                {labels?.cancel || 'Cancel'}
              </Button>
              <Button type="submit" disabled={isLoading || !path}>
                {isLoading ? (labels?.adding || 'Adding...') : (labels?.action || 'Add Project')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
