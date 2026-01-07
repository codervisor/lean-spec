import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  FolderOpen,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@leanspec/ui-components';
import { useProject } from '../contexts';
import { CreateProjectDialog } from '../components/projects/CreateProjectDialog';
import { ColorPicker } from '../components/shared/ColorPicker';
import { ProjectAvatar } from '../components/shared/ProjectAvatar';
import { api } from '../lib/api';
import type { Project, Stats } from '../types/api';

dayjs.extend(relativeTime);

type ValidationStatus = 'unknown' | 'validating' | 'valid' | 'invalid';
interface ValidationState {
  status: ValidationStatus;
  error?: string | null;
}

type ProjectStats = Stats;

export function SettingsPage() {
  const {
    currentProject,
    projects,
    loading,
    error,
    switchProject,
    updateProject,
    removeProject,
    toggleFavorite,
    refreshProjects,
    validateProject,
  } = useProject();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [validationStates, setValidationStates] = useState<Record<string, ValidationState>>({});
  const [statsCache, setStatsCache] = useState<Record<string, ProjectStats>>({});
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.path?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [projects, searchQuery]
  );

  useEffect(() => {
    const validateAll = async () => {
      for (const project of projects) {
        const existing = validationStates[project.id];
        if (existing && (existing.status === 'valid' || existing.status === 'invalid')) continue;

        setValidationStates((prev) => ({ ...prev, [project.id]: { status: 'validating' } }));
        try {
          const response = await validateProject(project.id);
          setValidationStates((prev) => ({
            ...prev,
            [project.id]: {
              status: response.validation.isValid ? 'valid' : 'invalid',
              error: response.validation.error,
            },
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Validation failed';
          setValidationStates((prev) => ({ ...prev, [project.id]: { status: 'invalid', error: message } }));
        }
      }
    };

    if (projects.length > 0) {
      void validateAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  useEffect(() => {
    const fetchStats = async () => {
      for (const project of projects) {
        if (statsCache[project.id]) continue;
        try {
          if (api.getProjectStats) {
            const stats = await api.getProjectStats(project.id);
            setStatsCache((prev) => ({ ...prev, [project.id]: stats }));
          }
        } catch {
          // Stats are best-effort; ignore errors
        }
      }
    };

    if (projects.length > 0) {
      void fetchStats();
    }
  }, [projects, statsCache]);

  const handleSwitchProject = async (projectId: string) => {
    if (projectId === currentProject?.id) return;

    setActionError(null);
    try {
      await switchProject(projectId);
      window.location.assign('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to switch project';
      setActionError(message);
    } finally {
    }
  };

  const handleProjectClick = async (projectId: string) => {
    await handleSwitchProject(projectId);
  };

  const startEditing = (projectId: string, name: string) => {
    setEditingProjectId(projectId);
    setEditingName(name);
  };

  const cancelEditing = () => {
    setEditingProjectId(null);
    setEditingName('');
  };

  const saveProjectName = async (projectId: string) => {
    if (!editingName.trim()) {
      setActionError('Project name cannot be empty');
      return;
    }
    setUpdatingId(projectId);
    try {
      await updateProject(projectId, { name: editingName.trim() });
      cancelEditing();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update project name';
      setActionError(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleColorChange = async (projectId: string, color: string) => {
    setUpdatingId(projectId);
    try {
      await updateProject(projectId, { color });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update project color';
      setActionError(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleValidate = async (projectId: string) => {
    setValidationStates((prev) => ({ ...prev, [projectId]: { status: 'validating' } }));
    try {
      const response = await validateProject(projectId);
      setValidationStates((prev) => ({
        ...prev,
        [projectId]: {
          status: response.validation.isValid ? 'valid' : 'invalid',
          error: response.validation.error,
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to validate project';
      setValidationStates((prev) => ({ ...prev, [projectId]: { status: 'invalid', error: message } }));
      setActionError(message);
    }
  };

  const handleFavoriteToggle = async (projectId: string) => {
    try {
      await toggleFavorite(projectId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update favorite state';
      setActionError(message);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    try {
      await removeProject(deleteTarget.id);
      setDeleteTarget(null);
      await refreshProjects();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete project';
      setActionError(message);
    }
  };

  const renderValidationIcon = (projectId: string) => {
    const state = validationStates[projectId];
    if (!state || state.status === 'unknown') return null;
    if (state.status === 'validating') {
      return <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    if (state.status === 'valid') {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (state.status === 'invalid') {
      return (
        <span title={state.error || 'Invalid project'}>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </span>
      );
    }
    return null;
  };

  const renderFooter = (project: Project) => {
    const lastAccessed = project.lastAccessed ? dayjs(project.lastAccessed).fromNow() : null;
    return (
      <div className="px-4 py-2 bg-muted/20 border-t flex items-center justify-between text-[10px] text-muted-foreground mt-auto">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color || '#666' }} />
          <span>Local</span>
        </div>
        {lastAccessed && <span>{lastAccessed}</span>}
      </div>
    );
  };

  const displayError = actionError || error;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto py-6 space-y-6 px-4 sm:px-8">
          {currentProject && (
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {currentProject.name}
            </button>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Projects</h1>
              <p className="text-muted-foreground mt-1 text-lg">Manage your LeanSpec projects and workspaces.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={refreshProjects} disabled={loading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)} size="lg" className="shadow-sm">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-8 space-y-6">
        {displayError && (
          <div className="p-4 border border-destructive/30 bg-destructive/5 text-destructive rounded-lg text-sm">
            {displayError}
          </div>
        )}

        {loading && projects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Loading settings...</div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProjects.map((project) => {
              const stats = statsCache[project.id];
              return (
                <Card
                  key={project.id}
                  className="group relative flex flex-col transition-all duration-200 hover:shadow-md hover:border-primary/20 overflow-hidden cursor-pointer bg-card"
                  onClick={() => void handleProjectClick(project.id)}
                >
                  <CardHeader className="px-4 pt-4 pb-2 space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <ProjectAvatar name={project.name || project.id} color={project.color} size="lg" className="shrink-0" />
                        <div className="flex-1 min-w-0">
                          {editingProjectId === project.id ? (
                            <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                              <Input
                                value={editingName}
                                onChange={(event) => setEditingName(event.target.value)}
                                className="h-7 text-sm"
                                autoFocus
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') saveProjectName(project.id);
                                  if (event.key === 'Escape') cancelEditing();
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void saveProjectName(project.id);
                                }}
                                disabled={updatingId === project.id}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  cancelEditing();
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-base leading-none truncate" title={project.name || project.id}>
                                {project.name || project.id}
                              </h3>
                              {renderValidationIcon(project.id)}
                            </div>
                          )}
                          <p className="text-[10px] font-mono text-muted-foreground truncate" title={project.path}>
                            {project.path || project.specsDir}
                          </p>
                        </div>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          sideOffset={4}
                          className="w-56"
                          onClick={(event: MouseEvent) => event.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2 h-9"
                            onClick={(event: MouseEvent) => {
                              event.stopPropagation();
                              startEditing(project.id, project.name || project.id);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            Rename
                          </Button>
                          <div className="p-2" onClick={(event: MouseEvent) => event.stopPropagation()}>
                            <p className="text-xs text-muted-foreground mb-2 px-2">Project Color</p>
                            <div className="flex flex-wrap gap-1 px-2">
                              <ColorPicker
                                value={project.color}
                                onChange={(color) => handleColorChange(project.id, color)}
                                disabled={updatingId === project.id}
                              />
                            </div>
                          </div>
                          <div className="h-px bg-border my-2" />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2 h-9"
                            onClick={(event: MouseEvent) => {
                              event.stopPropagation();
                              void handleFavoriteToggle(project.id);
                            }}
                          >
                            <Star className="h-4 w-4" />
                            {project.favorite ? 'Unfavorite' : 'Favorite'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2 h-9"
                            onClick={(event: MouseEvent) => {
                              event.stopPropagation();
                              void handleValidate(project.id);
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                            Validate Path
                          </Button>
                          <div className="h-px bg-border my-2" />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2 h-9 text-destructive hover:text-destructive"
                            onClick={(event: MouseEvent) => {
                              event.stopPropagation();
                              setDeleteTarget(project);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardHeader>

                  <CardContent className="px-4 pb-4 flex-1">
                    <div className="flex items-center gap-4 py-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Specs</span>
                        <span className="text-lg font-bold tracking-tight">{stats?.totalSpecs ?? 0}</span>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Completion</span>
                        <span className="text-lg font-bold tracking-tight">{Math.round(stats?.completionRate ?? 0)}%</span>
                      </div>
                    </div>
                  </CardContent>

                  {renderFooter(project)}

                  {project.favorite && (
                    <div className="absolute top-0 right-0 p-2 pointer-events-none">
                      <div className="bg-background/80 backdrop-blur-sm p-1.5 rounded-bl-lg border-b border-l shadow-sm">
                        <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}

            {filteredProjects.length === 0 && !loading && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/10">
                <div className="bg-muted/30 p-4 rounded-full mb-4">
                  <FolderOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold">No projects found</h3>
                <p className="text-muted-foreground mt-2 mb-6 max-w-sm">
                  {searchQuery
                    ? "We couldn't find any projects matching your search."
                    : 'Get started by creating your first LeanSpec project.'}
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <CreateProjectDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              This will remove the project from LeanSpec. It will not delete files on disk.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteTarget ? deleteTarget.path || deleteTarget.specsDir : ''}
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirmed}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
