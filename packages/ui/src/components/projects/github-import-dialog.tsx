import { Github } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/library';
import { useNavigate } from 'react-router-dom';
import { GitHubImportForm } from './github-import-form';

interface GitHubImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GitHubImportDialog({ open, onOpenChange }: GitHubImportDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Import from GitHub
          </DialogTitle>
          <DialogDescription>
            Connect a GitHub repository containing LeanSpec specs.
          </DialogDescription>
        </DialogHeader>

        <GitHubImportForm
          onSuccess={(projectId) => {
            onOpenChange(false);
            navigate(`/projects/${projectId}/specs`);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
