import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Loader2, Pencil, RefreshCcw, Star, Trash2 } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';
import { Navigation } from '../components/Navigation';
import { CreateProjectDialog } from '../components/projects/CreateProjectDialog';
import { ProjectAvatar } from '../components/shared/ProjectAvatar';
import { ColorPicker } from '../components/shared/ColorPicker';
import { useProject } from '../contexts';
import type { Project } from '../lib/api';

interface ValidationState {
  status: 'idle' | 'checking' | 'valid' | 'invalid';
  message?: string | null;
}

export function ProjectsPage() {
  const { t } = useTranslation('common');
  const {
    projects,
    currentProject,
    switchProject,
    toggleFavorite,
    removeProject,
    updateProject,
    validateProject,
    refreshProjects,
    loading,
  } = useProject();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [validation, setValidation] = useState<Record<string, ValidationState>>({});
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...projects].sort((a, b) => {
      if (a.favorite === b.favorite) return (a.name || '').localeCompare(b.name || '');
      return a.favorite ? -1 : 1;
    });

    return sorted.filter((project) => {
      if (!query) return true;
      const nameMatch = (project.name || project.id).toLowerCase().includes(query);
      const pathMatch = (project.path || project.specsDir || '').toLowerCase().includes(query);
      return nameMatch || pathMatch;
    });
  }, [projects, search]);

  const handleSwitch = useCallback(async (projectId: string) => {
    setSwitchingId(projectId);
    try {
      await switchProject(projectId);
      window.location.assign(`/projects/${projectId}/specs`);
    } catch (err) {
      console.error('Failed to switch project', err);
      setSwitchingId(null);
    }
  }, [switchProject]);

  const startRename = (project: Project) => {
    setRenamingId(project.id);
    setRenameValue(project.name || project.id);
  };

  const saveRename = async (projectId: string) => {
    if (!renameValue.trim()) return;
    try {
      await updateProject(projectId, { name: renameValue.trim() });
    } finally {
      setRenamingId(null);
      setRenameValue('');
    }
  };

  const handleValidate = async (projectId: string) => {
    setValidation((prev) => ({ ...prev, [projectId]: { status: 'checking' } }));
    try {
      const result = await validateProject(projectId);
      setValidation((prev) => ({
        ...prev,
        [projectId]: {
          status: result.validation.isValid ? 'valid' : 'invalid',
          message: result.validation.error || null,
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('projects.validationFailed');
      setValidation((prev) => ({ ...prev, [projectId]: { status: 'invalid', message } }));
    }
  };

  const getValidationBadge = (projectId: string) => {
    const state = validation[projectId];
    if (!state || state.status === 'idle') return null;
    if (state.status === 'checking') {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    if (state.status === 'valid') {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    return <span title={state.message || undefined}><AlertTriangle className="h-4 w-4 text-destructive" /></span>;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {currentProject ? `${t('navigation.home')} · ${currentProject.name}` : t('projects.projects')}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">{t('projects.projects')}</h1>
            <p className="text-muted-foreground">{t('projects.description')}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => void refreshProjects()} disabled={loading}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              {t('actions.refresh', { defaultValue: 'Refresh' })}
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              {t('projects.createProject')}
            </Button>
          </div>
        </div>

        <div className="max-w-md">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('quickSearch.searchPlaceholder', { defaultValue: 'Search projects...' })}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const isRenaming = renamingId === project.id;
            const isSwitching = switchingId === project.id;
            return (
              <Card key={project.id} className="flex flex-col">
                <CardHeader className="pb-3 flex flex-row items-start gap-3">
                  <ProjectAvatar name={project.name || project.id} color={project.color} size="lg" />
                  <div className="flex-1 min-w-0 space-y-1">
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="h-8"
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => void saveRename(project.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CardTitle className="truncate text-base">{project.name || project.id}</CardTitle>
                        {getValidationBadge(project.id)}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground truncate" title={project.path || project.specsDir || ''}>
                      {project.path || project.specsDir || '—'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startRename(project)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleFavorite(project.id)}>
                      <Star className={`h-4 w-4 ${project.favorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-xs uppercase tracking-wide">{t('projects.colorLabel')}</span>
                    <ColorPicker value={project.color} onChange={(color) => void updateProject(project.id, { color })} />
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-2"
                      onClick={() => void handleSwitch(project.id)}
                      disabled={isSwitching}
                    >
                      {isSwitching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
                      {isSwitching ? t('projectSwitcher.switching') : t('projects.switchProject')}
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => void handleValidate(project.id)}>
                      <CheckCircle2 className="h-4 w-4" />
                      {t('actions.validate')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 text-destructive"
                      onClick={() => void removeProject(project.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('actions.remove')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredProjects.length === 0 && (
          <div className="border rounded-lg p-6 text-center text-muted-foreground">
            {t('quickSearch.noResults')}
          </div>
        )}
      </div>

      <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
