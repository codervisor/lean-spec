import { useState } from 'react';
import { Search, AlertCircle, CheckCircle } from 'lucide-react';
import { Button, Input, Label } from '@/library';
import { api } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import type { GitHubDetectResult } from '../../lib/backend-adapter/core';

interface GitHubImportFormProps {
  onSuccess: (projectId: string) => void;
  onCancel: () => void;
}

export function GitHubImportForm({ onSuccess, onCancel }: GitHubImportFormProps) {
  const queryClient = useQueryClient();
  const [repo, setRepo] = useState('');
  const [token, setToken] = useState('');
  const [detected, setDetected] = useState<GitHubDetectResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDetect = async () => {
    if (!repo.trim()) return;
    setIsDetecting(true);
    setError(null);
    setDetected(null);
    try {
      const result = await api.detectGithubSpecs(repo.trim(), undefined, token || undefined);
      if (!result) {
        setError('No LeanSpec specs found in this repository. Make sure it has a `specs/` directory with numbered spec folders.');
      } else {
        setDetected(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect specs');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleImport = async () => {
    if (!detected) return;
    setIsImporting(true);
    setError(null);
    try {
      const result = await api.importGithubRepo(detected.repo, {
        branch: detected.branch,
        specsPath: detected.specsDir,
        token: token || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      onSuccess(result.projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import repository');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="github-repo">Repository</Label>
        <div className="flex gap-2">
          <Input
            id="github-repo"
            value={repo}
            onChange={(e) => { setRepo(e.target.value); setDetected(null); }}
            placeholder="owner/repo or GitHub URL"
            disabled={isDetecting || isImporting}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleDetect(); } }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleDetect()}
            disabled={!repo.trim() || isDetecting || isImporting}
          >
            {isDetecting ? (
              <span className="animate-pulse">…</span>
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          e.g. <code>acme/my-project</code> or <code>https://github.com/acme/my-project</code>
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="github-token">
          GitHub Token{' '}
          <span className="text-muted-foreground font-normal">(optional for public repos)</span>
        </Label>
        <Input
          id="github-token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_..."
          disabled={isDetecting || isImporting}
        />
        <p className="text-xs text-muted-foreground">
          Required for private repos. Set <code>LEANSPEC_GITHUB_TOKEN</code> on the server to avoid entering it here.
        </p>
      </div>

      {detected && (
        <div className="rounded-md border border-green-500/30 bg-green-500/5 p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            Found {detected.specCount} spec{detected.specCount !== 1 ? 's' : ''} in <code>{detected.specsDir}/</code>
          </div>
          <div className="text-xs text-muted-foreground">
            Branch: <code>{detected.branch}</code>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isImporting}>
          Cancel
        </Button>
        <Button
          onClick={() => void handleImport()}
          disabled={!detected || isImporting}
        >
          {isImporting ? 'Importing…' : `Import ${detected ? `(${detected.specCount} specs)` : ''}`}
        </Button>
      </div>
    </div>
  );
}
