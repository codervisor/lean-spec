import { GitBranch } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/library';
import { useNavigate } from 'react-router-dom';
import { GitImportForm } from './git-import-form';

interface GitImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GitImportDialog({ open, onOpenChange }: GitImportDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Import from Git
          </DialogTitle>
          <DialogDescription>
            Connect a Git repository containing LeanSpec specs.
          </DialogDescription>
        </DialogHeader>

        <GitImportForm
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
