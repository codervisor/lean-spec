'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, FolderOpen, Star, MoreVertical, Trash2, Pencil, RefreshCw, Check, X, AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useProject } from '@/contexts/project-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto py-6 space-y-6">
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

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects</h1>
              <p className="text-muted-foreground mt-1 text-lg">
                Manage your LeanSpec projects and workspaces.
              </p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="lg" className="shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>

          <div className="flex items-center space-x-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto py-8">
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProjects.map((project) => {
            const stats = statsCache[project.id];
            return (
            <Card 
              key={project.id} 
              className="group relative flex flex-col transition-all duration-200 hover:shadow-md hover:border-primary/20 overflow-hidden cursor-pointer bg-card"
              onClick={() => handleProjectClick(project.id)}
            >
              <div className="h-1 w-full" style={{ backgroundColor: project.color || 'hsl(var(--primary))' }} />
              
              <CardHeader className="px-4 pt-4 pb-2 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
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
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base leading-none truncate" title={project.name}>
                          {project.name}
                        </h3>
                        {getValidationIcon(project.id)}
                      </div>
                    )}
                    <p className="text-[10px] font-mono text-muted-foreground truncate" title={project.path}>
                      {project.path}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); startEditing(project.id, project.name); }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <div className="p-2" onClick={(e) => e.stopPropagation()}>
                        <p className="text-xs text-muted-foreground mb-2 px-2">Project Color</p>
                        <div className="flex flex-wrap gap-1 px-2">
                           {/* Simple color selection in menu */}
                           <ColorPicker
                              value={project.color}
                              onChange={(color) => handleColorChange(project.id, color)}
                           />
                        </div>
                      </div>
                      <DropdownMenuSeparator />
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
              
              <CardContent className="px-4 pb-4 flex-1">
                 <div className="flex items-center gap-4 py-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Specs</span>
                      <span className="text-lg font-bold tracking-tight">{stats?.totalSpecs || 0}</span>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Completion</span>
                      <span className="text-lg font-bold tracking-tight">{stats?.completionRate || 0}%</span>
                    </div>
                 </div>
              </CardContent>

              <div className="px-4 py-2 bg-muted/20 border-t flex items-center justify-between text-[10px] text-muted-foreground mt-auto">
                 <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color || '#666' }} />
                    <span>Local</span>
                 </div>
                 {project.lastAccessed && (
                    <span>{dayjs(project.lastAccessed).fromNow()}</span>
                 )}
              </div>
              
              {project.favorite && (
                <div className="absolute top-0 right-0 p-2 pointer-events-none">
                   <div className="bg-background/80 backdrop-blur-sm p-1.5 rounded-bl-lg border-b border-l shadow-sm">
                      <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                   </div>
                </div>
              )}
            </Card>
          )})}
          
          {filteredProjects.length === 0 && !isLoading && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/10">
              <div className="bg-muted/30 p-4 rounded-full mb-4">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">No projects found</h3>
              <p className="text-muted-foreground mt-2 mb-6 max-w-sm">
                {searchQuery ? "We couldn't find any projects matching your search." : "Get started by creating your first LeanSpec project."}
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </div>
          )}
        </div>

        <CreateProjectDialog 
          open={isCreateDialogOpen} 
          onOpenChange={setIsCreateDialogOpen} 
        />
      </div>
    </div>
  );
}
