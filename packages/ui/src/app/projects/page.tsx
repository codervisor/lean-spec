'use client';

import { useState, useCallback } from 'react';
import { Plus, Search, FolderOpen, Star, MoreVertical, Trash2, Pencil, RefreshCw, Check, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
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

export default function ProjectsPage() {
  const { projects, switchProject, toggleFavorite, removeProject, updateProject } = useProject();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [validationStates, setValidationStates] = useState<Record<string, ProjectValidationState>>({});

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProjectClick = async (projectId: string) => {
    await switchProject(projectId);
    // Optionally navigate to dashboard, but switchProject might handle it or we stay here
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
    <div className="container max-w-5xl py-8 space-y-8">
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
          <Card key={project.id} className="group relative hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <ColorPicker
                    value={project.color}
                    onChange={(color) => handleColorChange(project.id, color)}
                  />
                  <div className="space-y-1 flex-1 min-w-0">
                    {editingProjectId === project.id ? (
                      <div className="flex items-center gap-1">
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
                        <button
                          onClick={() => handleProjectClick(project.id)}
                          className="hover:underline focus:outline-none truncate"
                        >
                          {project.name}
                        </button>
                        {getValidationIcon(project.id)}
                      </CardTitle>
                    )}
                    <CardDescription className="text-xs truncate max-w-[180px]" title={project.path}>
                      {project.path}
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => startEditing(project.id, project.name)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleFavorite(project.id)}>
                      <Star className="mr-2 h-4 w-4" />
                      {project.favorite ? 'Unfavorite' : 'Favorite'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleValidate(project.id)}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Validate Path
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => removeProject(project.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center">
                  <FolderOpen className="mr-1 h-3 w-3" />
                  <span className="text-xs">Local</span>
                </div>
                {project.lastAccessed && (
                  <span className="text-xs">
                    Opened {dayjs(project.lastAccessed).fromNow()}
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
        
        {filteredProjects.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center border rounded-lg border-dashed">
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

      <CreateProjectDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />
    </div>
  );
}
