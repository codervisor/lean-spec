'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, FolderOpen, Star, MoreVertical, Trash2, Pencil, RefreshCw, Check, X, AlertTriangle, CheckCircle2, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useProject } from '@/contexts/project-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { ColorPicker } from '@/components/color-picker';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// Track validation status per project
type ValidationStatus = 'unknown' | 'validating' | 'valid' | 'invalid';
interface ProjectValidationState {
  status: ValidationStatus;
  error?: string;
}

// Project stats cache
interface ProjectStats {
  totalSpecs: number;
  specsByStatus: { status: string; count: number }[];
  completionRate: number;
}

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, currentProject, switchProject, toggleFavorite, removeProject, updateProject, isLoading } = useProject();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [validationStates, setValidationStates] = useState<Record<string, ProjectValidationState>>({});
  const [statsCache, setStatsCache] = useState<Record<string, ProjectStats>>({});
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-validate projects on load
  useEffect(() => {
    const validateAll = async () => {
      for (const project of projects) {
        // Skip if already validated
        if (validationStates[project.id]?.status === 'valid' || validationStates[project.id]?.status === 'invalid') {
          continue;
        }
        
        // Validate each project
        try {
          setValidationStates(prev => ({
            ...prev,
            [project.id]: { status: 'validating' }
          }));
          
          const response = await fetch(`/api/projects/${project.id}/validate`, {
            method: 'POST'
          });
          
          if (response.ok) {
            const data = await response.json();
            setValidationStates(prev => ({
              ...prev,
              [project.id]: {
                status: data.validation.isValid ? 'valid' : 'invalid',
                error: data.validation.error
              }
            }));
          }
        } catch {
          setValidationStates(prev => ({
            ...prev,
            [project.id]: { status: 'invalid', error: 'Validation failed' }
          }));
        }
      }
    };
    
    if (projects.length > 0) {
      validateAll();
    }
  }, [projects]);

  // Fetch stats for projects
  useEffect(() => {
    const fetchStats = async () => {
      for (const project of projects) {
        if (statsCache[project.id]) continue;
        
        try {
          const response = await fetch(`/api/projects/${project.id}/stats`);
          if (response.ok) {
            const data = await response.json();
            setStatsCache(prev => ({
              ...prev,
              [project.id]: data.stats
            }));
          }
        } catch {
          // Ignore stats fetch errors
        }
      }
    };
    
    if (projects.length > 0) {
      fetchStats();
    }
  }, [projects]);

  const handleProjectClick = async (projectId: string) => {
    await switchProject(projectId);
    router.push(`/projects/${projectId}/specs`);
  };

  const startEditing = (projectId: string, currentName: string) => {
    setEditingProjectId(projectId);
    setEditingName(currentName);
  };

  const cancelEditing = () => {
    setEditingProjectId(null);
    setEditingName('');
  };

  const saveProjectName = async (projectId: string) => {
    if (!editingName.trim()) {
      toast.error('Project name cannot be empty');
      return;
    }
    try {
      await updateProject(projectId, { name: editingName.trim() });
      toast.success('Project name updated');
      setEditingProjectId(null);
      setEditingName('');
    } catch {
      toast.error('Failed to update project name');
    }
  };

  const handleColorChange = async (projectId: string, color: string) => {
    try {
      await updateProject(projectId, { color });
      toast.success('Project color updated');
    } catch {
      toast.error('Failed to update project color');
    }
  };

  const handleValidate = useCallback(async (projectId: string) => {
    setValidationStates(prev => ({
      ...prev,
      [projectId]: { status: 'validating' }
    }));

    try {
      const response = await fetch(`/api/projects/${projectId}/validate`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Validation request failed');
      }

      const data = await response.json();
      
      setValidationStates(prev => ({
        ...prev,
        [projectId]: {
          status: data.validation.isValid ? 'valid' : 'invalid',
          error: data.validation.error
        }
      }));

      if (data.validation.isValid) {
        toast.success('Project path is valid');
      } else {
        toast.error(`Project path invalid: ${data.validation.error || 'Unknown error'}`);
      }
    } catch {
      setValidationStates(prev => ({
        ...prev,
        [projectId]: { status: 'invalid', error: 'Failed to validate' }
      }));
      toast.error('Failed to validate project');
    }
  }, []);

  const getValidationIcon = (projectId: string) => {
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

  const getSpecCount = (projectId: string) => {
    const stats = statsCache[projectId];
    return stats?.totalSpecs ?? null;
  };

  const selectedProjectData = selectedProject ? projects.find(p => p.id === selectedProject) : null;
  const selectedProjectStats = selectedProject ? statsCache[selectedProject] : null;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-muted/30">
      <div className="container max-w-5xl py-8 space-y-8">
        {/* Back navigation */}
        {currentProject && (
          <Link 
            href={`/projects/${currentProject.id}/specs`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {currentProject.name}
          </Link>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-2">
              Manage your LeanSpec projects and workspaces.
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card 
              key={project.id} 
              className="group relative hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedProject(project.id)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <ColorPicker
                      value={project.color}
                      onChange={(color) => {
                        handleColorChange(project.id, color);
                      }}
                    />
                    <div className="space-y-1 flex-1 min-w-0">
                      {editingProjectId === project.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-7 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveProjectName(project.id);
                              if (e.key === 'Escape') cancelEditing();
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => saveProjectName(project.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={cancelEditing}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <CardTitle className="text-base leading-none flex items-center gap-2">
                          <span className="truncate">
                            {project.name}
                          </span>
                          {getValidationIcon(project.id)}
                        </CardTitle>
                      )}
                      <CardDescription className="text-xs truncate max-w-[180px]" title={project.path}>
                        {project.path}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); startEditing(project.id, project.name); }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleFavorite(project.id); }}>
                        <Star className="mr-2 h-4 w-4" />
                        {project.favorite ? 'Unfavorite' : 'Favorite'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleValidate(project.id); }}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Validate Path
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); removeProject(project.id); }}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center">
                      <FolderOpen className="mr-1 h-3 w-3" />
                      <span className="text-xs">Local</span>
                    </div>
                    {getSpecCount(project.id) !== null && (
                      <div className="flex items-center">
                        <FileText className="mr-1 h-3 w-3" />
                        <span className="text-xs">{getSpecCount(project.id)} specs</span>
                      </div>
                    )}
                  </div>
                  {project.lastAccessed && (
                    <span className="text-xs">
                      {dayjs(project.lastAccessed).fromNow()}
                    </span>
                  )}
                </div>
              </CardContent>
              {project.favorite && (
                <div className="absolute top-2 right-10 text-yellow-500">
                  <Star className="h-4 w-4 fill-current" />
                </div>
              )}
            </Card>
          ))}
          
          {filteredProjects.length === 0 && !isLoading && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center border rounded-lg border-dashed bg-background">
              <FolderOpen className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No projects found</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {searchQuery ? "Try adjusting your search query." : "Get started by adding your first project."}
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </Button>
            </div>
          )}
        </div>

        {/* Project Detail Modal */}
        <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedProjectData?.name}
                {selectedProject && getValidationIcon(selectedProject)}
              </DialogTitle>
              <DialogDescription>
                {selectedProjectData?.path}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Stats */}
              {selectedProjectStats && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3">
                    <div className="text-2xl font-bold">{selectedProjectStats.totalSpecs}</div>
                    <div className="text-xs text-muted-foreground">Total Specs</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-2xl font-bold">{selectedProjectStats.completionRate}%</div>
                    <div className="text-xs text-muted-foreground">Completion</div>
                  </div>
                </div>
              )}
              
              {/* Status breakdown */}
              {selectedProjectStats?.specsByStatus && selectedProjectStats.specsByStatus.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">By Status</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedProjectStats.specsByStatus.map(({ status, count }) => (
                      <div key={status} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                        <span className="font-medium">{count}</span>
                        <span className="text-muted-foreground">{status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Last accessed */}
              {selectedProjectData?.lastAccessed && (
                <div className="text-xs text-muted-foreground">
                  Last opened {dayjs(selectedProjectData.lastAccessed).fromNow()}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedProject(null)}>
                Close
              </Button>
              <Button onClick={() => {
                if (selectedProject) {
                  handleProjectClick(selectedProject);
                }
              }}>
                Open Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <CreateProjectDialog 
          open={isCreateDialogOpen} 
          onOpenChange={setIsCreateDialogOpen} 
        />
      </div>
    </div>
  );
}
